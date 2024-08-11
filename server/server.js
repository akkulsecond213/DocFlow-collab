const connectDB = require('./config/db');
const dotenv = require('dotenv');
const Document = require('./models/document');
dotenv.config();
connectDB();
connectDB().catch(err => {
  console.error(`Error connecting to the database: ${err.message}`);
  process.exit(1); // Exit process if database connection fails
});


const io = require('socket.io')(4001, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const defaultValue = '';

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('get-document', async (documentId) => {
    try {
      const document = await findOrCreateDocument(documentId);
      socket.join(documentId);
      socket.emit('load-document', document.data);

      socket.on('send-changes', (delta) => {
        socket.broadcast.to(documentId).emit('receive-changes', delta);
      });

      socket.on('save-document', async (data) => {
        await Document.findByIdAndUpdate(documentId, { data });
      });
    } catch (error) {
      console.error(`Error in get-document: ${error.message}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;
  let document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}
