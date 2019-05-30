# Eventboss JS

Javascript Eventboss client.

### Sample usage:

Create eventboss instance:
```js
const Eventboss = require('eventboss')
const evenboss = Eventboss({ accountId: '1234', appName: 'payouts-webhooks', region: 'us-west-2', environment: 'development' })
```

Publish event:
```js
evenboss
  .publisher('event_name')
  .publish('payload')
  .then((result) => { /* ok */ })
  .catch((error) => { /* fail */ })
```

Consume event:
```js
evenboss
  .consumer('src_app_name', 'event_name')
  .listen((event) => {
    // do something with the event
  }, (error) => {
    // handle listening error
  });
```

### Developer mode:

```js
const eventboss = Eventboss({ autoCreate: true, accountId: '1234', appName: 'payouts-webhooks', region: 'us-west-2', environment: 'development' })
```

Passing `autoCreate: true` will enable auto create mode. Topics are automatically created when missing. Appropriate policy is needed in that case.
