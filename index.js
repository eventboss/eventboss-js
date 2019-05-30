const S = require('string');
const aws = require('aws-sdk');

const normalizedString = str => S(str).camelize().underscore();

const calculateTopicName = (appName, environment, eventName) => `eventboss-${normalizedString(appName)}-${normalizedString(eventName)}-${environment}`;
const calculateTopicArn = (accountId, region, topicName) => `arn:aws:sns:${region}:${accountId}:${topicName}`;
const calculateQueueName = (appName, srcAppName, environment, eventName) => `${normalizedString(appName)}-eventboss-${normalizedString(srcAppName)}-${normalizedString(eventName)}-${environment}`;
const calculateQueueUrl = (accountId, region, queueName) => `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;

const createTopicIfNeeded = function (sns, arn, topicName, autoCreate, doneHandler) {
  if (autoCreate) {
    sns.getTopicAttributes({ TopicArn: arn }, (err, data) => {
      if (data === null) {
        sns.createTopic({ Name: topicName }, () => {
          doneHandler(arn);
        });
      } else {
        doneHandler(arn);
      }
    });
  } else {
    doneHandler(arn);
  }
};

function Eventboss({ accountId, region, appName, environment, autoCreate }) {
  const sns = new aws.SNS({ region });
  const sqs = new aws.SQS({ region });

  return {
    consumer(srcAppName, eventName) {
      const queueName = calculateQueueName(appName, srcAppName, environment, eventName);
      const queueUrl = calculateQueueUrl(accountId, region, queueName);

      return {
        listen(onSuccess, onError) {
          const receiveMessage = (successHandler, errorHandler) => {
            sqs.receiveMessage({ QueueUrl: queueUrl, WaitTimeSeconds: 20 }).promise()
              .then((result) => {
                if (result.Messages) {
                  successHandler(JSON.parse(result.Messages[0].Body));
                  sqs.deleteMessage(
                    { QueueUrl: queueUrl, ReceiptHandle: result.Messages[0].ReceiptHandle })
                    .promise();
                }
                receiveMessage(successHandler, errorHandler);
              })
              .catch((error) => {
                error(error);
                setTimeout(() => {
                  receiveMessage(successHandler, errorHandler);
                }, 20000);
              });
          };
          receiveMessage(onSuccess, onError);
        },
      };
    },
    publisher(eventName) {
      const topicName = calculateTopicName(appName, environment || 'development', eventName);
      const topicArn = calculateTopicArn(accountId, region, topicName);

      return {
        publish(payload) {
          return new Promise((resolve, reject) => {
            createTopicIfNeeded(sns, topicArn, topicName, autoCreate, () => {
              sns.publish({ Message: JSON.stringify(payload), TopicArn: topicArn })
                .promise().then(resolve, reject);
            });
          });
        },
      };
    },
  };
}

module.exports = Eventboss;
