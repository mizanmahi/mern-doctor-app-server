const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv').config();
const { MongoClient } = require('mongodb');

const port = process.env.PORT || 5000; // important for heroku

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@phero-crud.9f5td.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
});

const main = async () => {
   try {
      await client.connect();
      console.log('Connected to MongoDB');

      const database = client.db('doctors-portal');
      const appointBookingCollection = database.collection('appointBookings');
      const userCollection = database.collection('users');

      //@ APIs

      app.get('/bookings', async (req, res) => {
         const { email, date } = req.query;

         const cursor = appointBookingCollection.find({
            patientEmail: email,
            date,
         });

         const bookings = await cursor.toArray();

         res.json(bookings);
      });

      app.post('/bookings', async (req, res) => {
         const appointBooking = req.body;
         const { insertedId } = await appointBookingCollection.insertOne(
            appointBooking
         );
         appointBooking._id = insertedId;
         res.json(appointBooking);
      });

      app.post('/users', async (req, res) => {
         const user = req.body;
         const { insertedId } = await userCollection.insertOne(user);
         user._id = insertedId;
         res.json(user);
      });

      //@ this will be basically an upsert  operation for google login
      app.put('/users', async (req, res) => {
         const user = req.body;
         const result = await userCollection.updateOne(
            {
               email: user.email,
            },
            {
               $set: user,
            },
            {
               upsert: true,
            }
         );
         user._id = result.upsertedId;
         res.json(user);
      });
   } catch (err) {
      console.error({ dbError: err });
   } finally {
      // client.close();
   }
};

main().catch(console.dir);

app.get('/', (req, res) => {
   res.send('Hello From Doctors Portal 😷');
});

app.listen(port, () => {
   console.log(`Doctors Portal Server listening at http://localhost:${port}`);
});
