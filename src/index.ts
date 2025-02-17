import { v4 as uuidv4 } from "uuid";
import { StableBTreeMap } from "azle";
import express from "express";

// Define data structures
class Producer {
  id: string;
  name: string;
  energyCapacity: number;
  pricePerKWh: number;
  availableEnergy: number;

  constructor(name: string, energyCapacity: number, pricePerKWh: number) {
    this.id = uuidv4();
    this.name = name;
    this.energyCapacity = energyCapacity;
    this.pricePerKWh = pricePerKWh;
    this.availableEnergy = energyCapacity;
  }
}

class Consumer {
  id: string;
  name: string;
  energyNeed: number;
  budget: number;

  constructor(name: string, energyNeed: number, budget: number) {
    this.id = uuidv4();
    this.name = name;
    this.energyNeed = energyNeed;
    this.budget = budget;
  }
}

class EnergyTransaction {
  transactionId: string;
  producerId: string;
  consumerId: string;
  energyAmount: number;
  totalPrice: number;
  // timestamp: Date;

  constructor(producerId: string, consumerId: string, energyAmount: number, totalPrice: number) {
    this.transactionId = uuidv4();
    this.producerId = producerId;
    this.consumerId = consumerId;
    this.energyAmount = energyAmount;
    this.totalPrice = totalPrice;
    // this.timestamp = getCurrentDate();
  }
}

// ✅ Fixed StableBTreeMap instantiation (used as a function, not a class)
const producersStorage = StableBTreeMap<string, Producer>(0);
const consumersStorage = StableBTreeMap<string, Consumer>(1);
const transactionsStorage = StableBTreeMap<string, EnergyTransaction>(2);

const app = express();
app.use(express.json());

// CRUD for Producers
app.post("/producers", (req, res) => {
  const { name, energyCapacity, pricePerKWh } = req.body;
  if (!name || energyCapacity === undefined || pricePerKWh === undefined) {
    return res.status(400).send("Missing required producer fields");
  }

  const producer = new Producer(name, energyCapacity, pricePerKWh);
  producersStorage.insert(producer.id, producer);
  res.json(producer);
});

app.get("/producers", (req, res) => {
  res.json(producersStorage.values());
});

// CRUD for Consumers
app.post("/consumers", (req, res) => {
  const { name, energyNeed, budget } = req.body;
  if (!name || energyNeed === undefined || budget === undefined) {
    return res.status(400).send("Missing required consumer fields");
  }

  const consumer = new Consumer(name, energyNeed, budget);
  consumersStorage.insert(consumer.id, consumer);
  res.json(consumer);
});

app.get("/consumers", (req, res) => {
  res.json(consumersStorage.values());
});

// Energy trading
app.post("/trade", (req, res) => {
  const { consumerId, producerId, energyAmount } = req.body;
  if (!consumerId || !producerId || energyAmount === undefined) {
    return res.status(400).send("Missing required trade fields");
  }

  const consumer = consumersStorage.get(consumerId);
  const producer = producersStorage.get(producerId);

  if (!consumer || !producer) {
    return res.status(404).send("Consumer or Producer not found");
  }

  // const totalPrice = energyAmount * producer.pricePerKWh;
  // if (producer.availableEnergy < energyAmount || consumer.budget < totalPrice) {
  //   return res.status(400).send("Insufficient energy or budget");
  // }

//   // Update records
//   producer.availableEnergy -= energyAmount;
//   consumer.budget -= totalPrice;
//   producersStorage.insert(producer.id, producer);
//   consumersStorage.insert(consumer.id, consumer);

//   const transaction = new EnergyTransaction(producer.id, consumer.id, energyAmount, totalPrice);
//   transactionsStorage.insert(transaction.transactionId, transaction);

//   res.json(transaction);
// });

app.get("/transactions", (req, res) => {
  res.json(transactionsStorage.values());
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Utility function to get the current date
function getCurrentDate(): Date {
  return new Date();
  }})