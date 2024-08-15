const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const dynamoDbClient = new DynamoDBClient({});
const auditTableName = process.env.table_name;
exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT") {
      const newItem = record.dynamodb.NewImage;
      const auditItem = {
        id: { S: uuidv4() },
        itemKey: { S: newItem.key.S },
        modificationTime: { S: new Date().toISOString() },
        newValue: {
          M: {
            key: { S: newItem.key.S },
            value: { N: newItem.value.N },
          },
        },
      };

      const putItemCommand = new PutItemCommand({
        TableName: auditTableName,
        Item: auditItem,
      });

      await dynamoDbClient.send(putItemCommand);
    } else if (record.eventName === "MODIFY") {
      const oldItem = record.dynamodb.OldImage;
      const newItem = record.dynamodb.NewImage;

      if (oldItem.value.N !== newItem.value.N) {
        const auditItem = {
          id: { S: uuidv4() },
          itemKey: { S: newItem.key.S },
          modificationTime: { S: new Date().toISOString() },
          updatedAttribute: { S: "value" },
          oldValue: { N: oldItem.value.N },
          newValue: { N: newItem.value.N },
        };

        const putItemCommand = new PutItemCommand({
          TableName: auditTableName,
          Item: auditItem,
        });

        await dynamoDbClient.send(putItemCommand);
      }
    }
  }
};
