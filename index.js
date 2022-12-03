const app = require("./app");
const port = process.env.PORT || 8000;
app.listen(8000, () => {
  console.log(`server listening at port - ${port}`);
});
