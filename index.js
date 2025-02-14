const express = require('express'); 
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config()

const cors = require('cors');

const port = process.env.PORT || 5000;

// midileware

app.use(cors());
app.use(express.json());

const verifyToken = (req,res,next) =>{
  console.log( "inside verify token " , req.headers.authorization)

  if(!req.headers.authorization){
    return res.status(401).send({message: 'forbidden access'})
  }

  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err,decoded) => {
    if(err) {
      return res.status(401).send({message: 'forbidden access'})
    }
    req.decoded = decoded;
    
    next()
  })

}




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jod42.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const userCollection = client.db("MasterCafedb").collection("users");
    const menuCollection = client.db("MasterCafedb").collection("menu");
    const reviewsCollection = client.db("MasterCafedb").collection("reviews");
    const cartCollection = client.db("MasterCafedb").collection("carts");

    // Create token:

    app.post('/jwt', (req,res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '1h'});
      res.send({token})
    })
    

    // 

    // user related apis:

    app.post('/users', async(req,res) => {
      const user = req.body;
      const query = {email : user.email};
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({message : "user already exist" , insertedId : null})
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    });

    app.get('/users',verifyToken, async(req,res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    });

    // verify admin : 

    app.get('/users/admin/:email',verifyToken, async(req,res) => {
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'unAuthorized access'})
      }
      const query = {email : email}
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === "admin"
      }
      res.send({admin})
    })


    app.delete('/users/:id', async(req,res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result  = await userCollection.deleteOne(query);
      res.send(result);
    });

    // create / update  new admin:
    app.patch('/users/admin/:id', async(req,res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set:{
          role:'admin'
        }
      }
      const result = await userCollection.updateOne(filter,updatedDoc);
      res.send(result);
    })
    // 

    app.get('/menu', async(req,res) => {
        const result = await menuCollection.find().toArray();
        res.send(result)
    })
    app.get('/reviews', async(req,res) => {
        const result = await reviewsCollection.find().toArray();
        res.send(result)
    })



    // cart collection 
    app.post('/carts', async(req,res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result)
    })

    app.get('/carts',async(req,res) => {
      const email =  req.query.email;
      const query = {email:email}
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })

    app.delete('/carts/:id',async(req,res) => {
      const id  = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result =  await cartCollection.deleteOne(query);
      res.send(result)
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res) => {
    res.send("Master Cafe server is running")
})

app.listen(port, () => {
    console.log(`Master Cafe is sitting on port: ${port}`)
})