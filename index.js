
const express = require('express')
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000
const cors = require('cors')
app.use(cors({
   origin: [
     'http://localhost:5173'
   ],
   credentials: true
}))
app.use(express.json())
app.use(cookieParser())
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f8w8siu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  
  

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  };

  async function run() {
    try { 
    const userCollection = client.db('accountDB').collection('accounts')
    const mobileCollection = client.db('accountDB').collection('mobile')
    const surveyorCollection = client.db('accountDB').collection('surveyor')
    const reportCollection = client.db('accountDB').collection('report')

    const verifyToken = async(req,res,next)=>{
      if(!req.headers.authorization){
           return res.status(401).send({messsage:'forbidden access'})
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
          if(err){
             return res.status(401).send({message:'forbidden access'})
          }
          req.decoded = decoded
          next()
      })
        //  const token = req.cookies?.token 
        // //  console.log('value of verify token',token);
        //  if(!token){
        //    return res.status(401).send({message: 'not autorized'})
        //  }
        //  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
        //   if(err){
        //     console.log(err);
        //     return res.status(401).send({message: 'unauthorized'})
        //   }
        //   req.user = decoded
        //   next()
        //  })
       
         
    }
  

    app.post('/jwt',async(req,res)=>{
       const user = req.body 
       const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET ,{expiresIn: '1000h'})
       res
       .cookie('token',token,cookieOptions)
       .send({token}) 
      //  .send({success:true})
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Your are not a admin' });
      }
      next();
    }

    const verifySurveyor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'surveyor';
      if (!isAdmin) {
        return res.status(403).send({ message: 'You are not a surveyor' });
      }
      next();
    }

    app.post('/logout',async(req,res)=>{
        const user = req.body;
        res.clearCookie('token',{...cookieOptions, maxAge:0}).send({success:true})

    })

    app.get('/users',async(req,res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
  })

   app.get('/adminuser/:id',verifyToken,verifyAdmin,async(req,res)=>{
    const id = req.params.id 
   
    if(id === "all")
    {
     const cursor = userCollection.find()
     const result = await cursor.toArray()
     res.send(result)
    }
    else{
      const query = {role: id}
      const cursor = userCollection.find(query) 
      const result = await cursor.toArray()
      res.send(result)
    }
   })



  app.get('/users/admin/:email', verifyToken,verifyAdmin,async (req, res) => {
    const email = req.params.email;
    // if (email !== req.decoded.email) {
    //   return res.status(403).send({ message: 'forbidden access' })
    // }
    const query = { email: email };
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === 'admin';
  }
    res.send({ admin });
})


  
    // app.get('/users',verifyToken,async(req,res)=>{
    //     const cursor = userCollection.find()
    //     const result = await cursor.toArray()
    //     res.send(result)
    // })

    app.post('/users',async(req,res)=>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message:'user already exists'})
      }
      const cartItem = req.body; 
      const result = await userCollection.insertOne(cartItem)
      res.send(result)
 })

 app.get('/useremail/:email',async(req,res)=>{
  const email = req.params.email
  console.log(email)
  const query = {email: email}
  const result = await userCollection.findOne(query)
  res.send(result)
 }) 

 app.delete('/users/:id',async(req,res)=>{
  const id = req.params.id; 
  const query = {
    _id: new ObjectId(id) 
  }
  const result = await userCollection.deleteOne(query)
  res.send(result)
})

app.patch('/users/admin/:id',verifyToken,verifyAdmin, async(req,res)=>{
 const id = req.params.id; 
 const filter = {_id : new ObjectId(id)}
 const updateDoc = {
    $set:{
       role: 'admin'
    }
 }
 const result = await userCollection.updateOne(filter,updateDoc)
 res.send(result)
})

app.patch('/users/surveyor/:id',verifyToken,verifyAdmin, async(req,res)=>{
  const id = req.params.id; 
  const filter = {_id : new ObjectId(id)}
  const updateDoc = {
     $set:{
        role: 'surveyor'
     }
  }
  const result = await userCollection.updateOne(filter,updateDoc)
  res.send(result)
 })

 app.patch('/users/pro/:email',verifyToken, async(req,res)=>{
   
   const email = req.params.email;
   const filter ={email :email}
  const updateDoc = {
     $set:{
        role: 'pro-user'
     }
  }
  const result = await userCollection.updateOne(filter,updateDoc)
  res.send(result)
 })
  
   
    
    app.get('/productsCount',async(req,res)=>{
        
      const count = await CoffeeCollection.estimatedDocumentCount();
      res.send({count});
 })

 app.get('/products',async(req,res)=>{
      
  const page = parseInt(req.query.page)
  const size = parseInt(req.query.size)


   const cursor = CoffeeCollection.find()
   const result = await cursor.skip(page * size).limit(size).toArray()
   res.send(result)
})

// paymnet 

app.post('/create-payment-intent',async(req,res)=>{
  const price = 100

  const amount = parseInt(price * 100)
  const paymentIntent = await stripe.paymentIntents.create({
      amount:amount, 
      currency:'usd',
      payment_method_types:[
         'card',
      ],  
   })

   res.send({
    clientSecret: paymentIntent.client_secret,
  });
  

});


app.get('/mobile',async(req,res)=>{
  const cursor = mobileCollection.find()
  const result = await cursor.toArray()
  res.send(result)
})

 app.get('/details/:id',async(req,res)=>{
  const id = req.params.id
  const query = {_id : new ObjectId(id)}
  const result = await surveyorCollection.findOne(query)
  res.send(result)
 }) 

 app.patch('/details/:id',async(req,res)=>{
    const id = req.params.id 
    const user = req.body 
    const {value} = user
    const query = {_id : new ObjectId(id)}
    if(value === "yes"){
        const updateDoc = {
           $inc:{
             countyes: 1,
             totalVotes:1,
           }
        }
        const result = await surveyorCollection.updateOne(query,updateDoc)

        const updated1 = {
          $set:{
            options: value,
         }
        }
        const result1 = await surveyorCollection.updateOne(query,updated1)
        res.send({result,result1})
    }
    else{
      const updateDoc = {
        $inc:{
          countno: 1,
          totalVotes:1,
        }
     }
     const result = await surveyorCollection.updateOne(query,updateDoc)

     const updated1 = {
       $set:{
         options: value,
      }
     }
     const result1 = await surveyorCollection.updateOne(query,updated1)
     res.send({result,result1})
    }
 })

app.get('/surveyor/:id',async(req,res)=>{
   const id = req.params.id 

   if(id === "all")
   {
    const cursor = surveyorCollection.find()
    const result = await cursor.toArray()
    res.send(result)
   }
   else{
     const query = {medium: id}
     const cursor = surveyorCollection.find(query) 
     const result = await cursor.toArray()
     res.send(result)
   }
})



app.post('/surveyor',verifyToken,verifySurveyor,async(req,res)=>{
    const user = req.body
    const result = await surveyorCollection.insertOne(user)
    res.send(user)
})

app.get('/dates',async(req,res)=>{
   const cursor = await surveyorCollection.find().sort('Timestamp', 1).limit(6) 
   const result = await cursor.toArray()
   res.send(result)
})

app.get('/totalvotes',async(req,res)=>{
  const cursor = await surveyorCollection.find().sort('totalVotes',-1).limit(6) 
  const result = await cursor.toArray()
  res.send(result)
})

app.post('/report',async(req,res)=>{
    const user = req.body;
    const result = await reportCollection.insertOne(user)
    res.send(result)
})




      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      
    }
  }
  run().catch(console.dir);
  
  
  
  
  
  
  app.get('/', (req, res) => {
      res.send('Hello World! it s me how are you i am localhost')
    })
  
  
  
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`)
    })
  
    
