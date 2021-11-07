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


      //@ APIs

      app.post('/bookings', async (req, res) => {
         const appointBooking = req.body;
         const { insertedId } = await appointBookingCollection.insertOne(appointBooking);
         appointBooking._id = insertedId;
         res.json(appointBooking);
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
