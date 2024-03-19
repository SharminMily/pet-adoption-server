const express = require('express')
const cors = require('cors') 
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

//middleware 
app.use(cors({
    origin: [
    'http://localhost:5173'
    ],
    credentials: true
}));

app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jzgy2jc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// console.log(uri)

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const petsCollection = client.db('petsAdoption').collection('allPets');
    const donationsCollection = client.db('petsAdoption').collection('donations');
    const userCollection = client.db("petsAdoption").collection("users");
    const cartCollection = client.db("petsAdoption").collection("carts");


    // All data
    app.get('/allPets', async(req, res) => {
        const cursor = petsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    // id
    app.get("/allPets/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await petsCollection.findOne(query);
      res.send(result)
  })

    // donations
    app.get('/donations', async(req, res) => {
        const cursor = donationsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

     // id

     app.get("/donations/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await donationsCollection.findOne(query);
      res.send(result)
  })


    // Users
    app.post('/users', async (req, res) => {
      const user = req.body;
      // 1.email unique, 2.upsert,  3. simple

      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    // console.log(result)

    // carts collection 2nd step
    app.get('/carts', async(req,res) => {
      const email = req.query.email;
      const query = {email: email}
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })
    // delete
    app.delete('/carts/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    })

    // carts collection 1
    app.post('/carts' , async(req, res) => {
      const cartItems  = req.body;
      const result = await cartCollection.insertOne(cartItems);
      res.send(result);
    });
    



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello pet Adoption!')
})

app.listen(port, () => {
    console.log(`pet Adoption is running on port ${port}`)
})