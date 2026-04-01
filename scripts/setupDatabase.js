/**
 * MongoDB Database Setup Script for SunMega
 * Run with: node scripts/setupDatabase.js
 * 
 * This script initializes collections and indexes for the new MongoDB Atlas cluster
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

// Load environment variables
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file')
  process.exit(1)
}

console.log('🔄 Connecting to MongoDB Atlas...')
console.log('🔗 URI:', MONGODB_URI.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://****:****@'))

// Define schemas inline (to avoid circular dependencies)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  discountPrice: { type: Number },
  image: { type: String },
  gallery: [{ type: String }],
  specifications: [{ name: String, value: String }],
  features: [{ type: String }],
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const InquirySchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  productInterest: { type: String, required: true },
  message: { type: String },
  contactMethod: { type: String },
  status: { type: String, enum: ['new', 'contacted', 'in-progress', 'closed', 'spam'], default: 'new' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'read', 'replied', 'archived'], default: 'new' },
  createdAt: { type: Date, default: Date.now }
})

const NewsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  subscribedAt: { type: Date, default: Date.now }
})

const AdminActivityLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: Object },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now }
})

async function setupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    console.log('✅ Connected to MongoDB Atlas')
    console.log('📊 Database:', mongoose.connection.name)

    // Get database instance
    const db = mongoose.connection.db

    // List existing collections
    const collections = await db.listCollections().toArray()
    const existingCollectionNames = collections.map(c => c.name)
    console.log('\n📁 Existing collections:', existingCollectionNames.length ? existingCollectionNames.join(', ') : 'None')

    // Define models (creates collections if they don't exist)
    const User = mongoose.model('User', UserSchema)
    const Product = mongoose.model('Product', ProductSchema)
    const Inquiry = mongoose.model('Inquiry', InquirySchema)
    const Contact = mongoose.model('Contact', ContactSchema)
    const Newsletter = mongoose.model('Newsletter', NewsletterSchema)
    const AdminActivityLog = mongoose.model('AdminActivityLog', AdminActivityLogSchema)

    console.log('\n🗂️  Creating collections...')

    // Create collections by calling createCollection (if not exists)
    const collectionsToCreate = [
      { name: 'users', model: User },
      { name: 'products', model: Product },
      { name: 'inquiries', model: Inquiry },
      { name: 'contacts', model: Contact },
      { name: 'newsletters', model: Newsletter },
      { name: 'adminactivitylogs', model: AdminActivityLog }
    ]

    for (const { name, model } of collectionsToCreate) {
      if (!existingCollectionNames.includes(name)) {
        await db.createCollection(name)
        console.log(`  ✅ Created collection: ${name}`)
      } else {
        console.log(`  ⏭️  Collection already exists: ${name}`)
      }
    }

    // Create indexes
    console.log('\n🔍 Creating indexes...')

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ role: 1 })
    await User.collection.createIndex({ createdAt: -1 })
    console.log('  ✅ User indexes created')

    // Product indexes
    await Product.collection.createIndex({ category: 1 })
    await Product.collection.createIndex({ isActive: 1 })
    await Product.collection.createIndex({ price: 1 })
    await Product.collection.createIndex({ createdAt: -1 })
    // Text search index
    await Product.collection.createIndex({ 
      name: 'text', 
      description: 'text',
      features: 'text' 
    })
    console.log('  ✅ Product indexes created')

    // Inquiry indexes
    await Inquiry.collection.createIndex({ email: 1 })
    await Inquiry.collection.createIndex({ status: 1 })
    await Inquiry.collection.createIndex({ createdAt: -1 })
    await Inquiry.collection.createIndex({ productInterest: 1 })
    console.log('  ✅ Inquiry indexes created')

    // Contact indexes
    await Contact.collection.createIndex({ email: 1 })
    await Contact.collection.createIndex({ status: 1 })
    await Contact.collection.createIndex({ createdAt: -1 })
    console.log('  ✅ Contact indexes created')

    // Newsletter indexes
    await Newsletter.collection.createIndex({ email: 1 }, { unique: true })
    await Newsletter.collection.createIndex({ subscribedAt: -1 })
    console.log('  ✅ Newsletter indexes created')

    // Admin Activity Log indexes
    await AdminActivityLog.collection.createIndex({ adminId: 1 })
    await AdminActivityLog.collection.createIndex({ action: 1 })
    await AdminActivityLog.collection.createIndex({ entityType: 1 })
    await AdminActivityLog.collection.createIndex({ createdAt: -1 })
    console.log('  ✅ Admin Activity Log indexes created')

    // Check if admin user exists
    console.log('\n👤 Checking admin user...')
    const adminExists = await User.findOne({ email: 'sunmega254@gmail.com' })
    
    if (!adminExists) {
      console.log('  📝 Creating default admin user...')
      
      // Create admin user with hashed password
      const hashedPassword = await bcrypt.hash('Admin123!', 10)
      
      const adminUser = new User({
        email: 'sunmega254@gmail.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      })
      
      await adminUser.save()
      console.log('  ✅ Admin user created')
      console.log('     Email: sunmega254@gmail.com')
      console.log('     Password: Admin123!')
      console.log('     ⚠️  Please change this password after first login!')
    } else {
      console.log('  ⏭️  Admin user already exists')
    }

    // Show final stats
    console.log('\n📊 Database Setup Complete!')
    console.log('============================')
    const finalCollections = await db.listCollections().toArray()
    console.log(`Total collections: ${finalCollections.length}`)
    
    for (const collection of finalCollections) {
      const count = await db.collection(collection.name).countDocuments()
      console.log(`  - ${collection.name}: ${count} documents`)
    }

    console.log('\n✨ Setup finished successfully!')
    console.log('\nNext steps:')
    console.log('1. ⬆️  Deploy your backend to Render')
    console.log('2. 🔑 Set environment variables (MONGODB_URI, JWT_SECRET, etc.)')
    console.log('3. 🚀 Your API is ready at https://api.sunmega.co.ke')
    console.log('4. 🌐 Admin panel at https://smmirror.co.ke/admin')

  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('\n👋 Disconnected from MongoDB')
  }
}

// Run the setup
setupDatabase()
