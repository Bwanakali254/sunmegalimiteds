import mongoose from 'mongoose';
import Product from '../models/productModel.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Seed script to populate products from frontend data
 * Products are inquiry-based (no prices) - for quote requests
 * Run with: node scripts/seedProducts.js
 */

const seedProducts = [
  {
    name: 'Battery Pack Series - High Capacity',
    description: 'High-capacity lithium battery pack designed for residential and commercial energy storage systems. Features long lifespan, high efficiency, and advanced safety mechanisms.',
    price: null,
    category: 'batteries',
    subCategory: ['battery-pack-series'],
    brand: 'Sun Mega',
    image: ['/assets/products/Batteries/Battery pack series/WechatIMG2827.avif'],
    features: ['High capacity', 'Long lifespan', 'Advanced safety'],
    specifications: {
      capacity: '10 kWh',
      voltage: '48V',
      cycles: '6000+',
      warranty: '10 years'
    }
  },
  {
    name: 'Battery Pack Series - Standard',
    description: 'Reliable lithium battery pack for everyday energy storage needs. Perfect for residential solar systems and backup power solutions.',
    price: null,
    category: 'batteries',
    subCategory: ['battery-pack-series'],
    brand: 'Sun Mega',
    image: ['/assets/products/Batteries/Battery pack series/WechatIMG2828.avif'],
    features: ['Reliable performance', 'Easy installation', 'Maintenance-free'],
    specifications: {
      capacity: '5 kWh',
      voltage: '48V',
      cycles: '5000+',
      warranty: '10 years'
    }
  },
  {
    name: 'Battery Pack Series - Compact',
    description: 'Compact lithium battery pack ideal for small residential installations and portable energy storage applications.',
    price: null,
    category: 'batteries',
    subCategory: ['battery-pack-series'],
    brand: 'Sun Mega',
    image: ['/assets/products/Batteries/Battery pack series/WechatIMG2829.avif'],
    features: ['Compact size', 'Lightweight', 'Portable'],
    specifications: {
      capacity: '2.5 kWh',
      voltage: '48V',
      cycles: '5000+',
      warranty: '10 years'
    }
  },
  {
    name: 'Battery Pack Series - Industrial',
    description: 'Heavy-duty industrial battery pack designed for large-scale commercial and industrial energy storage systems.',
    price: null,
    category: 'batteries',
    subCategory: ['battery-pack-series'],
    brand: 'Sun Mega',
    image: ['/assets/products/Batteries/Battery pack series/WechatIMG2830.avif'],
    features: ['Industrial grade', 'Scalable', 'High durability'],
    specifications: {
      capacity: '20 kWh',
      voltage: '48V',
      cycles: '8000+',
      warranty: '10 years'
    }
  },
  {
    name: 'Single-Phase All-in-One Solution (Stack Model)',
    description: 'Complete single-phase solar solution combining inverter, battery, and smart management system. Perfect for residential installations.',
    price: null,
    category: 'energy-storage-systems',
    subCategory: ['single-phase', 'all-in-one'],
    brand: 'Sun Mega',
    image: ['/assets/products/Single-phase products/Single-phase All in one solution/Single-phase All in one solution 1.avif'],
    features: ['All-in-one design', 'Easy installation', 'Smart monitoring'],
    specifications: {
      inverterPower: '5 kW',
      batteryCapacity: '10 kWh',
      efficiency: '97.5%',
      warranty: '5 years'
    }
  },
  {
    name: 'Single-Phase All-in-One Solution Premium',
    description: 'Premium single-phase solar system with enhanced features and larger battery capacity for extended backup power.',
    price: null,
    category: 'energy-storage-systems',
    subCategory: ['single-phase', 'all-in-one'],
    brand: 'Sun Mega',
    image: ['/assets/products/Single-phase products/Single-phase All in one solution/Single-phase All in one solution 2.avif'],
    features: ['Premium build', 'Extended backup', 'Enhanced monitoring'],
    specifications: {
      inverterPower: '8 kW',
      batteryCapacity: '15 kWh',
      efficiency: '98%',
      warranty: '5 years'
    }
  },
  {
    name: 'Single-Phase Hybrid Series',
    description: 'Versatile single-phase hybrid inverter compatible with both solar panels and grid power. Features seamless switching and smart energy management.',
    price: null,
    category: 'energy-storage-systems',
    subCategory: ['single-phase', 'hybrid'],
    brand: 'Sun Mega',
    image: ['/assets/products/Single-phase products/Single-phase hybrid series/Single-phase hybrid series.avif'],
    features: ['Hybrid technology', 'Grid backup', 'Smart switching'],
    specifications: {
      ratedPower: '5 kW',
      maxPvInput: '8 kW',
      efficiency: '97%',
      warranty: '5 years'
    }
  },
  {
    name: 'Three-Phase All-in-One Solution (Indoor)',
    description: 'Professional three-phase solar system designed for indoor installation. Ideal for commercial buildings with three-phase power requirements.',
    price: null,
    category: 'energy-storage-systems',
    subCategory: ['three-phase', 'all-in-one'],
    brand: 'Sun Mega',
    image: ['/assets/products/Three-phase products/Three-Phase All-in-one Solution(Indoor and Outdoor)/Three-Phase All-in-one Solution (indoor)/Three-Phase All-in-one Solution (indoor).avif'],
    features: ['Indoor installation', 'Commercial grade', 'Three-phase output'],
    specifications: {
      inverterPower: '15 kW',
      batteryCapacity: '30 kWh',
      efficiency: '98%',
      warranty: '5 years'
    }
  },
  {
    name: 'Three-Phase All-in-One Solution (Outdoor)',
    description: 'Robust three-phase solar system designed for outdoor installation. Weather-resistant housing with IP65 protection rating.',
    price: null,
    category: 'energy-storage-systems',
    subCategory: ['three-phase', 'all-in-one'],
    brand: 'Sun Mega',
    image: ['/assets/products/Three-phase products/Three-Phase All-in-one Solution(Indoor and Outdoor)/Three-Phase All-in-one Solution (outdoor)/Three-Phase All-in-one Solution (outdoor).avif'],
    features: ['Weather resistant', 'IP65 protection', 'Outdoor rated'],
    specifications: {
      inverterPower: '15 kW',
      batteryCapacity: '30 kWh',
      efficiency: '98%',
      protection: 'IP65',
      warranty: '5 years'
    }
  },
  {
    name: 'Three-Phase Grid-on Series',
    description: 'High-efficiency three-phase grid-tie inverter for commercial solar installations. Features advanced grid synchronization and remote monitoring.',
    price: null,
    category: 'energy-storage-systems',
    subCategory: ['three-phase', 'grid-on'],
    brand: 'Sun Mega',
    image: ['/assets/products/Three-phase products/Three-Phase Grid-on Series/Three-Phase Grid-on Series.avif'],
    features: ['Grid-tie ready', 'High efficiency', 'Remote monitoring'],
    specifications: {
      ratedPower: '20 kW',
      maxEfficiency: '98.5%',
      gridVoltage: '400V',
      warranty: '5 years'
    }
  },
  {
    name: 'Three-Phase Hybrid Series',
    description: 'Advanced three-phase hybrid inverter with battery backup capability. Perfect for commercial installations requiring uninterrupted power supply.',
    price: null,
    category: 'energy-storage-systems',
    subCategory: ['three-phase', 'hybrid'],
    brand: 'Sun Mega',
    image: ['/assets/products/Three-phase products/Three-Phase Hybrid Series/Three-Phase Hybrid Series.avif'],
    features: ['Hybrid technology', 'Battery backup', 'Uninterruptible power'],
    specifications: {
      ratedPower: '25 kW',
      batteryVoltage: '48V',
      efficiency: '97.8%',
      warranty: '5 years'
    }
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sunmega', {
      dbName: 'sunmega'
    });
    console.log(`Connected to MongoDB: ${conn.connection.host} | Database: ${conn.connection.name}`);

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert new products
    const insertedProducts = await Product.insertMany(seedProducts);
    console.log(`Successfully inserted ${insertedProducts.length} inquiry-based products`);

    // Log inserted products
    insertedProducts.forEach(product => {
      console.log(`  - ${product.name} (${product.category})`);
    });

    console.log('\n✅ Database seeded successfully with inquiry-based products!');
    console.log('Customers will need to request quotes for pricing.');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the seed function
seedDatabase();
