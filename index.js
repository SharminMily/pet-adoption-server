const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://pet-adoptionss.surge.sh",
      // "https://pet-adoption-3aec5.firebaseapp.com",  
           
    ],
    credentials: true,
  })
);

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jzgy2jc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// console.log(uri)

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const petsCollection = client.db("petsAdoption").collection("allPets");
    const donationsCollection = client
      .db("petsAdoption")
      .collection("donations");
    const userCollection = client.db("petsAdoption").collection("users");
    const cartCollection = client.db("petsAdoption").collection("carts");
    const myDonationsCollection = client.db("petsAdoption").collection("myDonations");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SEC, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // console.log(process.env.ACCESS_TOKEN_SECRET)

    // middlewares verify
    const verifyToken = (req, res, next) => {
      // console.log("inside varify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SEC, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
      // next();
    };
    //  admin verify
    // use verify admin after token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // Users
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      // console.log(req.headers);
      const user = req.body;
      // 1.email unique, 2.upsert,  3. simple
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // make admin
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // delete
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // console.log(result)

    // All data
    app.get("/allPets", async (req, res) => {    
      const search = req.query.search;    
      const query = {};
      if (search) {
        query.petName = { $regex: search, $options: "i" };
      }    
      const result = await petsCollection.find(query).toArray();
      res.send(result)
    });

    // update
    app.get("allPets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.findOne(query);
      res.send(result);
    });
    // id
    app.get("/allPets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.findOne(query);
      res.send(result);
    });

    // update patch
    app.patch("/allPets/:id", async (req, res) => {
      const pet = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          petName: pet.petName,
          petAge: pet.petAge,
          petLocation: pet.petLocation,
          description: pet.description,
          category: pet.category,
          petImage: pet.petImage,
        },
      };
      const result = await petsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // add kora post
    app.post("/allPets", async (req, res) => {
      const pet = req.body;
      const result = await petsCollection.insertOne(pet);
      res.send(result);
    });

    // delete
    app.delete("/allPets/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.deleteOne(query);
      res.send(result);
    });


    // donations
    app.get("/donations", async (req, res) => {
      const filter = req.query;   
      const category = req.query.category;
      const donationRang = req.query.donationRang;
      // const query = {      
      //   donatedAmount : {$gte: 60, $gt: 50},
      //   donatedAmount : {$lte: 60, $gte: 50}
      // };

      const filterObj = {};

      if (donationRang) {
        const [min, max] = donationRang.split("-").map(Number);
        filterObj.donatedAmount = { $gte: min, $lte: max };
      }
    
      if (category) {
        filterObj.category = category;
      }        
      const options = {
        sort: {
          donatedAmount: filter.sort === 'asc' ? 1: -1
        }
      };     
      
      const cursor = donationsCollection.find(filterObj, options);
     
      const result = await cursor.toArray();
      res.send(result);
    });

    // id
    app.get("/donations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationsCollection.findOne(query);
      res.send(result);
    });

    // 

    //  my donation
    app.post("/myDonations", async (req, res) => {
      const donationsItems = req.body;
      const result = await myDonationsCollection.insertOne(donationsItems);
      res.send(result);
    });

    // 
    app.get("/myDonations", async (req, res) => {
      const cursor = myDonationsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // delete
    app.delete("/myDonations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myDonationsCollection.deleteOne(query);
      res.send(result);
    });


    // carts collection 2nd step
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    // delete
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // carts collection 1
    app.post("/carts", async (req, res) => {
      const cartItems = req.body;
      const result = await cartCollection.insertOne(cartItems);
      res.send(result);
    });

    //  stats or analytics
    app.get('/admin-stats', async(req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const allPets = await petsCollection.estimatedDocumentCount();
      const donations = await donationsCollection.estimatedDocumentCount();

      // 
      res.send({
        users,
        allPets,
        donations
      })
    })
 
       // user
       app.get('/user-stats', async(req, res) => {
        const cart = await cartCollection.estimatedDocumentCount();
        const myDonation = await myDonationsCollection.estimatedDocumentCount();
        // 
        res.send({
         cart,
         myDonation
        })
      })
  

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello pet Adoption!");
});

app.listen(port, () => {
  console.log(`pet Adoption is running on port ${port}`);
});
