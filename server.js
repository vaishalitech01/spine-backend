import express from 'express';
import connectDB from './config/db.js';
import cors from 'cors';
import 'dotenv/config';
import './config/cron.js';

// Route Imports
import notificationRoutes from "./routes/notificationRoutes.js";
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import spinRoutes from './routes/spinRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import upiVerificationRoutes from './routes/upiVerificationRoutes.js';
import addressVerify from "./routes/addressRoute.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Error connecting to the database:', error);
    process.exit(1);
});

// Default Route
app.get('/', (req, res) => {
    res.send('Hello World from backend!');
});

// Route Usage
app.use('/api/auth', authRoutes);
app.use('/api/profile', userRoutes);
app.use('/api/spin', spinRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/invest', investmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/reward', rewardRoutes);
app.use('/api/upiVerification', upiVerificationRoutes);
app.use('/api/addressVerify', addressVerify);

app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});
