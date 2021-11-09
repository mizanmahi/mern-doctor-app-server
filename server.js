const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv').config();
const { MongoClient } = require('mongodb');
const admin = require('firebase-admin');

admin.initializeApp({
   credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACC_SDK)),
});

const port = process.env.PORT || 5000; // important for heroku

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@phero-crud.9f5td.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
});

//@ token verifying middleware
const verifyToken = async (req, res, next) => {
   if (
      req.headers?.authorization &&
      req.headers?.authorization?.startsWith('Bearer ')
   ) {
      const idToken = req.headers.authorization.split('Bearer ')[1];
      try {
         const decodedIdToken = await admin.auth().verifyIdToken(idToken);
         req.decodedEmail = decodedIdToken.email;
         return next();
      } catch (error) {
         console.log('Error while verifying Firebase ID token:', error.message);
         return res.status(403).json({ message: error.message });
      }
   } else {
      console.log(
         'No Firebase ID token was passed as a Bearer token in the Authorization header.'
      );
      return res.status(403).json({ message: 'Unauthorized' });
   }
};

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

      // GET getting a single user by email
      app.get('/users/:email', async (req, res) => {
         const { email } = req.params;
         const user = await userCollection.findOne({ email });
         res.json(user);
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

      app.put('/users/admin', verifyToken, async (req, res) => {
         const { email } = req.body;
         const { decodedEmail } = req;

         if (decodedEmail) {
            const requester = await userCollection.findOne({
               email: decodedEmail,
            });
            if (requester.role === 'admin') {
               const result = await userCollection.updateOne(
                  { email },
                  { $set: { role: 'admin' } }
               );

               res.json(result);
            } else {
               res.status(403).json({
                  message: 'You are not allowed to make admin',
               });
            }
         }
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
