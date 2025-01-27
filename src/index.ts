import { v4 as uuidv4 } from "uuid";
import { StableBTreeMap } from "azle";
import { CanisterMethodInfo } from "azle";

// Types for Producers, Consumers, and Transactions
type Producer = {
  Some: any;
  id: string;
  name: string;
  energyCapacity: bigint; // In kWh
  pricePerKWh: bigint; // Price per kWh (in smallest unit, e.g., cents)
  availableEnergy: bigint; // Energy left to sell (in kWh)
};

type Consumer = {
  id: string;
  name: string;
  energyNeed: bigint; // Amount of energy needed (in kWh)
  budget: bigint; // Budget available for purchase (in smallest unit)
};

type EnergyTransaction = {
  producerId: string;
  consumerId: string;
  energyAmount: bigint; // Amount of energy transacted (in kWh)
  totalPrice: bigint; // Total price for the transaction (in smallest unit)
};

// Stable storage for Producers, Consumers, and Transactions
const producers = StableBTreeMap<string, Producer>(0); // For storing Producers
const consumers = StableBTreeMap<string, Consumer>(1); // For storing Consumers
const transactions = StableBTreeMap<string, EnergyTransaction>(2); // For storing Transactions

// Helper function to get the current date in milliseconds
function getCurrentDate(): Date {
  const timestamp = new Number(Date.now());
  return new Date(timestamp.valueOf());
}

// P2P Energy Trading Canister Actor
export const p2pEnergyTrading = {  // Add a new producer
  addProducer: async (name: string, energyCapacity: bigint, pricePerKWh: bigint): Promise<string> => {
    const id = uuidv4(); // Generate unique ID for the producer
    const newProducer: Producer = {
      Some: null,
      id,
      name,
      energyCapacity,
      pricePerKWh,
      availableEnergy: energyCapacity,
    };
    producers.insert(id, newProducer);
    return `Producer ${name} added successfully with ${energyCapacity} kWh capacity.`;
  },  // Add a new consumer
  addConsumer: async (name: string, energyNeed: bigint, budget: bigint): Promise<string> => {
    const id = uuidv4(); // Generate unique ID for the consumer
    const newConsumer: Consumer = {
      id,
      name,
      energyNeed,
      budget,
    };
    consumers.insert(id, newConsumer);
    return `Consumer ${name} added successfully with a need for ${energyNeed} kWh and budget ${budget}.`;
  },
  // Get all producers
  getAllProducers: async (): Promise<Producer[]> => {
    return producers.values();
  },

  // Get all consumers
  getAllConsumers: async (): Promise<Consumer[]> => {
    return consumers.values();
  },

  // Match a consumer with a producer based on their energy need and budget
  matchProducerConsumer: async (consumerId: string): Promise<string> => {
    const consumerOpt = consumers.get(consumerId);
    if (!consumerOpt) {
      return `Consumer with ID ${consumerId} not found.`;
    }

    const consumer = consumerOpt.Some;
    if (!consumer) {
      return `Consumer with ID ${consumerId} not found.`;
    }

    // Find a matching producer for the consumer
    let matchedProducer: Producer | null = null;
    for (const producerOpt of producers.values()) {
      const producer = producerOpt.Some;
      if (producer && producer.availableEnergy >= consumer.energyNeed &&
        producer.pricePerKWh <= consumer.budget / consumer.energyNeed
      ) {
        matchedProducer = producer;
        break;
      }
    }

    if (!matchedProducer) {
      return `No suitable producer found for consumer ${consumerId}.`;
    }

    return `Found a match with producer ${matchedProducer.name} at ${matchedProducer.pricePerKWh} per kWh.`;
  },

  // Execute a transaction between a producer and a consumer
  executeTransaction: async (consumerId: string, producerId: string): Promise<string> => {
    const consumerOpt = consumers.get(consumerId);
    const producerOpt = producers.get(producerId);

    if (!consumerOpt) {
      return `Consumer with ID ${consumerId} not found.`;
    }

    if (!producerOpt) {
      return `Producer with ID ${producerId} not found.`;
    }

    const consumer = consumerOpt.Some;
    const producer = producerOpt.Some;

    if (!consumer || !producer) {
      return `Consumer or Producer not found.`;
    }

    // Check if the consumer can afford the energy and the producer has enough capacity
    if (consumer.energyNeed > producer.availableEnergy) {
      return `Producer doesn't have enough available energy.`;
    }
    if (consumer.budget < consumer.energyNeed * producer.pricePerKWh) {
      return `Consumer doesn't have enough budget.`;
    }

    // Calculate the total price for the energy
    const totalPrice = consumer.energyNeed * producer.pricePerKWh;

    // Create the energy transaction record
    const transaction: EnergyTransaction = {
      producerId,
      consumerId,
      energyAmount: consumer.energyNeed,
      totalPrice,
    };

    // Store the transaction
    transactions.insert(`${consumerId}-${producerId}`, transaction);

    // Update the producer's available energy and the consumer's budget
    producer.availableEnergy -= consumer.energyNeed;
    consumer.budget -= totalPrice;
    consumers.insert(consumerId, consumer);
    producers.insert(producerId, producer);

    // Return a success message
    return `Transaction successful: ${consumer.name} bought ${consumer.energyNeed} kWh from ${producer.name} for ${totalPrice}.`;

  },  
    // Update producer details (e.g., energy capacity or price)
updateProducer: async (producerId: string, energyCapacity?: bigint, pricePerKWh?: bigint): Promise<string> => {
    const producerOpt = producers.get(producerId);

    if ("None" in producerOpt) {
      return `Producer with ID ${producerId} not found.`;
    }

    const producer = producerOpt.Some;

    // Update the producer's details
    if (energyCapacity !== undefined) producer.energyCapacity = energyCapacity;
    if (pricePerKWh !== undefined) producer.pricePerKWh = pricePerKWh;

    // Save the updated producer
    producers.insert(producerId, producer);
    return `Producer ${producerId} updated successfully.`;
},// Update consumer details (e.g., energy need or budget)
updateConsumer: async (consumerId: string, energyNeed?: bigint, budget?: bigint): Promise<string> => {
  // Retrieve the consumer from the storage
  const consumerOpt = consumers.get(consumerId); // TypeScript will infer this as `Consumer | undefined`

  // Check if the consumer exists
  if ("None" in consumerOpt) {
    return `Consumer with ID ${consumerId} not found.`;
  }

  const consumer = consumerOpt.Some; // Get the consumer

  // Update the consumer's details if necessary
  if (energyNeed !== undefined) consumer.energyNeed = energyNeed;
  if (budget !== undefined) consumer.budget = budget;

  // Save the updated consumer back into the storage
  consumers.insert(consumerId, consumer);
  return `Consumer ${consumerId} updated successfully.`;
},
// Delete a consumer
deleteConsumer: async (consumerId: string): Promise<string> => {
  // Retrieve the consumer from the storage
  const consumerOpt = consumers.get(consumerId); // TypeScript will infer this as `Consumer | undefined`

  // Check if the consumer exists
  if ("None" in consumerOpt) {
    return `Consumer with ID ${consumerId} not found.`;
  }

  // Remove the consumer from the storage
  consumers.remove(consumerId);
  return `Consumer ${consumerId} deleted successfully.`;
},}

