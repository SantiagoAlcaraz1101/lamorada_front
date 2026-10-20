// Solo escribe datos académicos en el entorno desechable; nunca ejecuta el seed de desarrollo.
const path = require('node:path');
const backend = path.resolve(__dirname, '../../backend');
if (process.env.MONGO_URL !== 'mongodb://127.0.0.1:27028' || process.env.DB_NAME !== 'la_morada_assessment') throw new Error('Destino de seed inseguro');
const mongoose = require(path.join(backend, 'node_modules/mongoose'));
const User = require(path.join(backend, 'src/modules/user/models/user'));
const Product = require(path.join(backend, 'src/modules/product/models/product'));
const Cart = require(path.join(backend, 'src/modules/cart/models/cart'));
const { hashPassword } = require(path.join(backend, 'src/modules/auth/strategies/password-strategy'));
async function main() {
  await mongoose.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME });
  for (const [id, email, role] of [['2000000001', 'paciente@lamorada.test', 'patient'], ['1000000001', 'psicologa@lamorada.test', 'psychologist']]) {
    const user = await User.findOneAndUpdate({ _id: id }, { document_type: 'CC', email, name: 'Prueba', last_name1: 'Morada', last_name2: 'QA', age: 25, phone: '3000000002', role, password: await hashPassword('Morada123!') }, { upsert: true, new: true });
    const cart = await Cart.findOneAndUpdate({ user_id: id }, { products_id: [], total: 0 }, { upsert: true, new: true });
    user.cart_id = cart._id; await user.save();
  }
  await Product.findOneAndUpdate({ _id: '650000000000000000000001' }, { title: 'Habitos atomicos QA', author: 'James Clear', publish_year: 2018, price: 65000, cover_url: 'http://localhost:4200/assets/lamorada-logo.png' }, { upsert: true, new: true });
  await mongoose.disconnect();
  console.log('Dos usuarios ficticios y un libro QA preparados.');
}
main().catch(async e => { console.error(e.message); await mongoose.disconnect(); process.exitCode = 1; });
