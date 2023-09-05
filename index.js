const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jsonwebtoken = require('jsonwebtoken');
const pg = require('pg');

const app = express();

// Configure CORS
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure body parser
app.use(bodyParser.json());

// Create a connection to the PostgreSQL database
const connectionString = 'postgres://localhost:5432/todos';
const pool = new pg.Pool(connectionString);

// Create a JWT secret
const jwtSecret = process.env.JWT_SECRET || 'secret';

// Define the routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // Check if the user exists and the password is correct
  const user = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);

  if (!user.length) {
    res.status(401).json({ message: 'Incorrect email or password' });
    return;
  }

  // Create a JWT token
  const token = jsonwebtoken.sign({ id: user[0].id }, jwtSecret, { expiresIn: '1h' });

  // Return the JWT token
  res.status(200).json({ token });
});

app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;

  // Check if the email address is already taken
  const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

  if (existingUser.length) {
    res.status(400).json({ message: 'Email address already taken' });
    return;
  }

  // Create a new user in the database
  await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, password]);

  // Create a JWT token
  const token = jsonwebtoken.sign({ id: user[0].id }, jwtSecret, { expiresIn: '1h' });

  // Return the newly created user
  res.status(201).json({ token });
});

app.post('/api/todos', async (req, res) => {
  // Check for JWT token
  const authHeader = req.headers['Authorization'];

  if (!authHeader) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Verify the JWT token
  try {
    const decoded = jsonwebtoken.verify(token, jwtSecret);
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { title, description } = req.body;

  // Create a new todo
  const todo = {
    title,
    description,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await pool.query('INSERT INTO todos (title, description, createdAt, updatedAt) VALUES ($1, $2, $3, $4)', [title, description, todo.createdAt, todo.updatedAt]);

  res.status(201).json(todo);
});

app.get('/api/todos', async (req, res) => {
  // Check for JWT token
  const authHeader = req.headers['Authorization'];

  if (!authHeader) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Verify the JWT token
  try {
    const decoded = jsonwebtoken.verify(token, jwtSecret);
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get the user ID from the JWT token
  const userId = decoded.id;

  // Get all todos for the user
  const todos = await pool.query('SELECT * FROM todos WHERE user_id = $1', [userId]);

  res.json(todos);
});

// Get a todo by id
app.get('/api/todos/:id', async (req, res) => {
  // Check for JWT token
  const authHeader = req.headers['Authorization'];

  if (!authHeader) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Verify the JWT token
  try {
    const decoded = jsonwebtoken.verify(token, jwtSecret);
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get the user ID from the JWT token
  const userId = decoded.id;

  // Get the todo by id
  const id = req.params.id;

  const todo = await pool.query('SELECT * FROM todos WHERE id = $1 AND user_id = $2', [id, userId]);

  if (!todo.length) {
    res.status(404).json({ message: 'Todo not found' });
    return;
  }

  res.json(todo[0]);
});

// Update a todo
app.put('/api/todos/:id', async (req, res) => {
  // Check for JWT token
  const authHeader = req.headers['Authorization'];

  if (!authHeader) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Verify the JWT token
  try {
    const decoded = jsonwebtoken.verify(token, jwtSecret);
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Get the user ID from the JWT token
  const userId = decoded.id;

  // Get the todo by id
  const id = req.params.id;

  const { title, description } = req.body;

  // Update the todo
  await pool.query('UPDATE todos SET title = $1, description = $2, updatedAt = $3 WHERE id = $4 AND user_id = $5', [title, description, new Date(), id, userId]);

  res.status(200).json({ message: 'Todo updated' });
});

app.delete('/api/todos/:id', async (req, res) => {
  // Delete a todo by id
  const id = req.params.id;

  await pool.query('DELETE FROM todos WHERE id = $1', [id]);

  res.status(200).json({ message: 'Todo deleted' });
});

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});