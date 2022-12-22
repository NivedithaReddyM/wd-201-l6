"use strict";
const { Op, where } = require("sequelize");
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Todo.belongsTo(models.User, {
        foreignKey: "userID",
      });
      // define association here
    }
    //addTodo
    static addTodo({ title, dueDate, userID }) {
      return this.create({
        title: title,
        dueDate: dueDate,
        completed: false,
        userID,
      });
    }
    //getTodos
    static getTodos(userID) {
      return this.findAll({
        where: {
          userID,
        },
      });
    }
    //overDue
    static async overDue(userID) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
          userID,
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
    //dueToday
    static async dueToday(userID) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date(),
          },
          userID,
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
    //dueLater
    static async dueLater(userID) {
      return await Todo.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
          userID,
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
    //completedItems
    static async completedItems(userID) {
      return await Todo.findAll({
        where: {
          completed: true,
          userID,
        },
      });
    }
    //remove
    static async remove(id, userID) {
      return this.destroy({
        where: {
          id,
          userID,
        },
      });
    }

    setCompletionStatus(state) {
      return this.update({ completed: state });
    }
  }
  //initializing todo model
  Todo.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
          len: 5,
        },
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          notNull: true,
        },
      },
      completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
