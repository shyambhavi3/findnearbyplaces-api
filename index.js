const express = require('express');
const app = express();
const port= process.env.PORT || 4000;
const cors = require('cors');




//middleware
app.use(cors());
app.use(express.json());



app.get('/', (req,res)=>{
    res.status(200).json({done: true , message: 'Welcome'})
})
app.listen(port,()=>{
    console.log('server has started');
})