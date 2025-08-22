const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Atlas API funcionando correctamente');
});

app.listen(PORT, () => {
  console.log(`Servidor Atlas escuchando en el puerto ${PORT}`);
});
