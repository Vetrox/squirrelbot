const MongoClient = require('mongodb').MongoClient;

// singleton class to keep a single, global, open connection to the database
class MongoConnection {
    static async open() {
        if (this.db) return this.db;
        try {
            this.client = await MongoClient(this.url, this.options).connect();
            this.db = await this.client.db('bot');
        } catch (err) {
            // TODO add proper log
            console.error('Failed to instantiate database connection: ' + err);
        }
        return this.db;
    }
}

MongoConnection.db = null;
MongoConnection.url = 'mongodb://127.0.0.1:27017/bot';
MongoConnection.options = {
    bufferMaxEntries:   0,
    reconnectTries:     5000,
    useNewUrlParser:    true,
    useUnifiedTopology: true
};

module.exports = { MongoConnection };
