const Eventboss = require('../index');

jest.mock('aws-sdk');
const aws = require('aws-sdk');

function mockSnsPublisher() {
  const then = jest.fn();
  aws.SNS.prototype.publish = jest.fn(() => {
    return {
      promise() {
        return {
          then,
        };
      },
    };
  });
  return then;
}

function mockSqsListiner() {
  const then = jest.fn(() => {
    return {
      catch: jest.fn(),
    };
  });
  aws.SQS.prototype.receiveMessage = jest.fn(() => {
    return {
      promise() {
        return {
          then,
        };
      },
    };
  });
  return then;
}

describe('Eventboss', () => {
  describe('publish', () => {
    it('sends stringified message to proper eventboss topic', () => {
      const successCallback = mockSnsPublisher();
      const publisher = Eventboss({ accountId: '1234', region: 'us-west-2', appName: 'app-name' }).publisher('event_name');
      publisher.publish({});

      expect(aws.SNS.prototype.publish).toBeCalledWith({
        Message: '{}',
        TopicArn: 'arn:aws:sns:us-west-2:1234:eventboss-app-name-event_name-development',
      });
      expect(successCallback).toBeCalled();
    });

    it('sends message to custom SNS topic', () => {
      const successCallback = mockSnsPublisher();

      const publisher = Eventboss({ accountId: '1234', region: 'us-west-2', appName: 'app-name', nameInfix: 'event_ah' }).publisher('event_name');
      publisher.publish({});

      expect(aws.SNS.prototype.publish).toBeCalledWith({
        Message: '{}',
        TopicArn: 'arn:aws:sns:us-west-2:1234:event_ah-app-name-event_name-development',
      });
      expect(successCallback).toBeCalled();
    });

    it('creates topic if autoCreate is set', () => {
      aws.SNS.prototype.getTopicAttributes = function (attr, callback) {
        callback(null, null);
      };
      aws.SNS.prototype.createTopic = jest.fn();
      const publisher = Eventboss({ accountId: '1234', region: 'us-west-2', appName: 'app-name', autoCreate: true }).publisher('event_name');
      publisher.publish({});
      expect(aws.SNS.prototype.createTopic).toBeCalledWith({ Name: 'eventboss-app-name-event_name-development' }, expect.any(Function));
    });

    it('does not create topic if not autoCreate', () => {
      aws.SNS.prototype.getTopicAttributes = function (attr, callback) {
        callback(null, null);
      };
      aws.SNS.prototype.createTopic = jest.fn();
      const publisher = Eventboss({ accountId: '1234', region: 'us-west-2', appName: 'app-name', autoCreate: false }).publisher('event_name');
      publisher.publish({});
      expect(aws.SNS.prototype.createTopic).not.toBeCalled();
    });
  });

  describe('listen', () => {
    it('calls receive message with queue url and wait time with 20 seconds', () => {
      const successCallback = mockSqsListiner();

      const consumer = Eventboss({ accountId: '1234', region: 'us-west-2', appName: 'app-name', environment: 'integration', nameInfix: 'event_ah' }).consumer('src-app-name', 'event_name');
      consumer.listen(() => {}, () => {});
      expect(aws.SQS.prototype.receiveMessage).toBeCalledWith({ QueueUrl: 'https://sqs.us-west-2.amazonaws.com/1234/app-name-event_ah-src-app-name-event_name-integration', WaitTimeSeconds: 20 });
      expect(successCallback).toBeCalled();
    });
  });
});
