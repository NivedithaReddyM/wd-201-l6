const express = require("express");
const app = express();
const { Todo } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
const { response } = require("express");

app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname + "/public")));
// app.use(express.static("public"));

app.get("/", async (request, response)=>{
  // response.send("Hello World");
  const allTodosAre = await Todo.findAll();
  console.log(allTodosAre);
  if (request.accepts("html")) {
    response.render("index", {
      allTodosAre,
    });
  } else {
    response.json(allTodosAre);
  }
});

app.get("/todos", async function (_request, response) {
  console.log("Processing list of all Todos are ........");
  // FILL IN YOUR CODE HERE
  try {
    const todo = await Todo.findAll();
    return response.send(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
  // First, we have to query our PostgerSQL database using Sequelize to get list of all Todos.
  // Then, we have to respond with all Todos, like:
  // response.send(todos)
});


app.post("/todos", async (req, res) => {
  console.log("Body : ", req.body);
  try {
    const todo = await Todo.addTodo({
      title: req.body.title,
      dueDate: req.body.dueDate,
      completed: false,
    });
    return res.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id/markAsCompleted", async (req, res) => {
  console.log("Todo marks completed : ", req.params.id);
  const todo = await Todo.findByPk(req.params.id);
  try {
    const updateTodo = await todo.markAsCompleted();
    return res.json(updateTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

// eslint-disable-next-line no-unused-vars
app.delete("/todos/:id", async (req, res) => {
  console.log("We have to delete a Todo with ID: ", req.params.id);
  const affectedRow = await Todo.destroy({ where: { id: req.params.id } });
  res.send(affectedRow ? true : false);
});

module.exports = app;
