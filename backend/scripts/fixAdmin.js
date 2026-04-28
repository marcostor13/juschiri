const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../src/db');
const User = require('../src/models/User');

async function run() {
  await connectDB();
  console.log("Verificando usuarios administradores...");

  let admin = await User.findOne({ email: 'admin@example.com' });
  
  if (!admin) {
      console.log("Creando admin@example.com...");
      const salt = await bcrypt.genSalt(10);
      const password = await bcrypt.hash('admin123', salt);
      admin = await User.create({
          name: 'Admin',
          email: 'admin@example.com',
          password: password,
          role: 'admin'
      });
      console.log("Admin creado: admin@example.com / admin123");
  } else {
      console.log("El usuario admin@example.com ya existe. Forzando contraseña a admin123...");
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash('admin123', salt);
      await admin.save();
      console.log("Contraseña reseteada a: admin123");
  }
  
  const users = await User.find({}, '-password');
  console.log("Usuarios en BD:", users);
  
  process.exit(0);
}

run().catch(console.error);
