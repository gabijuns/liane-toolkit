import elasticsearch from "elasticsearch";

const config = Meteor.settings.elasticsearch;

if (!config) {
  throw new Meteor.Error("Missing elasticsearch settings");
}

const client = new elasticsearch.Client(config);

client.ping(
  {
    requestTimeout: 1000
  },
  error => {
    if (error) {
      throw new Meteor.Error(500, error);
    } else {
      logger.info("Connected to elasticsearch");
    }
  }
);

client.searchAsync = Meteor.wrapAsync(client.search).bind(client);

elastic = client;

export default client;
