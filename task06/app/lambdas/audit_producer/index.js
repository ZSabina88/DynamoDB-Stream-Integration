const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const docClient = new DynamoDBClient({});

exports.handler = async (event) => {
    const tableName = process.env.table_name || 'Audit';

    for (const record of event.Records) {
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY' || record.eventName === 'REMOVE') {
            const auditEntry = createAuditEntry(record);
            await saveAuditEntry(auditEntry, tableName);
        }
    }
};

function createAuditEntry(record) {
    const newImage = record.dynamodb.NewImage ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) : null;
    const oldImage = record.dynamodb.OldImage ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage) : null;

    const auditEntry = {
        id: uuidv4(), 
        timestamp: new Date().toISOString(),
        eventName: record.eventName,
        newImage: newImage || {},
        oldImage: oldImage || {},
        changedAttributes: getChangedAttributes(oldImage, newImage)
    };

    return auditEntry;
}

function getChangedAttributes(oldImage, newImage) {
    const changedAttributes = {};

    for (const key in newImage) {
        if (newImage[key] !== oldImage[key]) {
            changedAttributes[key] = {
                old: oldImage ? oldImage[key] : null,
                new: newImage[key]
            };
        }
    }

    return changedAttributes;
}

async function saveAuditEntry(auditEntry, tableName) {
    const params = {
        TableName: tableName,
        Item: auditEntry
    };

    try {
        await docClient.put(params).promise();
    } catch (err) {
        console.error("Error saving audit entry: ", err);
        throw err;
    }
}
