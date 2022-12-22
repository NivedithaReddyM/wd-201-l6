const express = require("express");//express
const app = express();
var csrf = require("tiny-csrf");//csrf
var cookieParser = require("cookie-parser");//cookie-parser
const { Todo, User } = require("./models");
const bodyParser = require("body-parser");//body-parser
const path = require("path");
const bcrypt = require("bcrypt");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStratergy = require("passport-local");

const saltRounds = 10;

// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
app.use(flash());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.use(
  session({
    secret: "my-super-secret-key-2837428907583420",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

//initializing the passport
app.use(passport.initialize());
app.use(passport.session());

//validating username and password to login
passport.use(
  new LocalStratergy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid Email ID" });
        });
    }
  )
);

//serializing the user
passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

//deserializing the user
passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));

//displaying the home page
app.get("/", async function (request, response) {
  if (request.user) {
    return response.redirect("/todos");
  } else {
    response.render("index", {
      title: "Niveditha's To-Do Manager",
      csrfToken: request.csrfToken(),
    });
  }
});

//displaying todos
app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const loggedIn = request.user.id;
      const userName = request.user.firstName + " " + request.user.lastName;
      const overDue = await Todo.overDue(loggedIn);
      const dueToday = await Todo.dueToday(loggedIn);
      const dueLater = await Todo.dueLater(loggedIn);
      const completedItems = await Todo.completedItems(loggedIn);
      if (request.accepts("html")) {
        response.render("todos", {
          title: "To-Do Manager",
          userName,
          overDue,
          dueToday,
          dueLater,
          completedItems,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          overDue,
          dueToday,
          dueLater,
          completedItems,
        });
      }
    } catch (err) {
      console.log(err);
      return response.status(422).json(err);
    }
  }
);


app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Sign up",
    csrfToken: request.csrfToken(),
  });
});

//signup form
app.post("/users", async (request, response) => {
  //validating firstname,email,password and sending the corresponding flash messages
  if (!request.body.firstName) {
    request.flash("error", "Please enter your first name");
    return response.redirect("/signup");
  }
  if (!request.body.email) {
    request.flash("error", "Please enter email ID");
    return response.redirect("/signup");
  }
  if (!request.body.password) {
    request.flash("error", "Please enter password");
    return response.redirect("/signup");
  }
  if (request.body.password < 8) {
    request.flash("error", "Password should contain atleast 8 characters");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      } else {
        response.redirect("/todos");
      }
    });
  } catch (error) {
    request.flash("error", error.message);
    return response.redirect("/signup");
  }
});

app.get("/login", (request, response) => {
  response.render("login", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
});

//post request for validating the credentials
app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    response.redirect("/todos");
  }
);

//signout
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

// app.get("/todos", async function (_request, response) {
//   console.log("Processing list of all Todos ...");
//   // FILL IN YOUR CODE HERE
//   try {
//     const todos = await Todo.findAll();
//     return response.json(todos);
//   } catch (error) {
//     console.log(error);
//     return response.status(422).json(error);
//   }
// });

app.get(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const todo = await Todo.findByPk(request.params.id);
      return response.json(todo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//validating the todos entered
app.post(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    //validating todo title length and duedate
    if (request.body.title.length < 5) {
      request.flash("error", "Title must contain atleast 5 characters!");
      return response.redirect("/todos");
    }
    if (!request.body.dueDate) {
      request.flash("error", "Please select a valid due date");
      return response.redirect("/todos");
    }
    try {
      await Todo.addTodo({
        title: request.body.title,
        dueDate: request.body.dueDate,
        userID: request.user.id,
      });
      return response.redirect("/todos");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//marking a to-do as completed
app.put(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const todo = await Todo.findByPk(request.params.id);
      const updatedTodo = await todo.setCompletionStatus(
        request.body.completed
      );
      return response.json(updatedTodo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//delete to-do by id
app.delete(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to delete a Todo with ID: ", request.params.id);
    // FILL IN YOUR CODE HERE
    try {
      const res = await Todo.remove(request.params.id, request.user.id);
      return response.json({ success: res === 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
    // First, we have to query our database to delete a Todo by ID.
    // Then, we have to respond back with true/false based on whether the Todo was deleted or not.
    // response.send(true)
  }
);

module.exports = app;
