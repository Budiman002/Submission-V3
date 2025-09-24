const amqp = require('amqplib');

class MessageBrokerService {
  constructor() {
    this._connection = null;
    this._channel = null;
  }

  async connect() {
    try {
      const rabbitmqServer = process.env.RABBITMQ_SERVER || 'amqp://localhost';
      this._connection = await amqp.connect(rabbitmqServer);
      this._channel = await this._connection.createChannel();
      
      console.log('Connected to RabbitMQ server');
      return true;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error.message);
      return false;
    }
  }

  async sendMessage(queue, message) {
    try {
      if (!this._channel) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('Failed to connect to message broker');
        }
      }

      await this._channel.assertQueue(queue, { durable: true });
      
      const messageBuffer = Buffer.from(JSON.stringify(message));
      this._channel.sendToQueue(queue, messageBuffer, { persistent: true });
      
      console.log(`Message sent to queue ${queue}:`, message);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async consumeMessage(queue, callback) {
    try {
      if (!this._channel) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('Failed to connect to message broker');
        }
      }

      await this._channel.assertQueue(queue, { durable: true });
      
      this._channel.consume(queue, async (message) => {
        if (message) {
          const content = JSON.parse(message.content.toString());
          console.log(`Message received from queue ${queue}:`, content);
          
          try {
            await callback(content);
            this._channel.ack(message);
          } catch (error) {
            console.error('Error processing message:', error);
            this._channel.nack(message, false, false); // Don't requeue failed messages
          }
        }
      });
      
      console.log(`Consuming messages from queue: ${queue}`);
    } catch (error) {
      console.error('Error consuming messages:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this._channel) {
        await this._channel.close();
      }
      if (this._connection) {
        await this._connection.close();
      }
      console.log('RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}

module.exports = MessageBrokerService;