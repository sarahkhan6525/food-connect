var express = require("express");
var router = express.Router();
var userModel = require("./users");
var foodModel = require("./food");
var passport = require("passport");
var upload = require("./multer");

var localStrategy = require("passport-local");

passport.use(new localStrategy(userModel.authenticate()));

router.get("/", function (req, res, next) {
  var flashError = req.flash("error");
  res.render("login", { err: flashError });
});

router.get("/signup", function (req, res, next) {
  var flashError = req.flash("error");
  res.render("signup", { err: flashError });
});

router.get("/login", function (req, res, next) {
  var flashError = req.flash("error");
  res.render("login", { err: flashError });
});

router.get("/home", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  await user.populate("donations");
  res.render("home", { user: user });
});

router.get("/all-donations", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const food = await foodModel.find();

  res.render("allDonations", { food: food, user: user });
});

router.get("/help", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  await user.populate("donations");
  res.render("help", { user: user });
});

router.get("/terms", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("terms", { user: user });
});

router.get("/analytics",isLoggedin, async function (req, res) {
  const users = await userModel.find();
  const foods = await foodModel.find();
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("analytics", { user: user, users: users, foods: foods  });
});

router.get("/editprofile", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  res.render("edit", { user: user });
});

router.post("/updateprofile", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    {
      username: req.body.username,
      name: req.body.name,
      phone: req.body.phone,
      from: req.body.from,
      address: req.body.address,
    },
    { new: true }
  );
  await user.save();

  res.redirect("/profile");
});

router.post("/fileupload", isLoggedin , upload.single("image"), async function (req, res, next) {
  const user = await userModel.findOne({username : req.session.passport.user});
  user.profilePicture = req.file.filename;
  await user.save();
  res.redirect('/profile');
});

router.get("/donation/:id", isLoggedin, async function (req, res, next) {
  const id = req.params.id;
  console.log(id);
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  const food = await foodModel.findOne({ _id: id });
  await food.populate("donatedBy");
  res.render("donation", { food: food, user: user });
});

router.post("/donatefood", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  console.log(user);
  const food = await foodModel.create({
    pickupLocation: req.body.pickupLocation,
    date: req.body.uploadDate,
    pickupDate: req.body.pickupDate,
    pickupTime: req.body.pickupTime,
    foodItems: req.body.foodItems,
    foodQuantity: req.body.foodQuantity,
    donatedBy: user._id,
  });

  console.log("Food: ", food._id);

  user.donations.push(food._id);
  await user.save();
  res.redirect("/home");
});

router.get("/accept-food/:id", isLoggedin, async function (req, res, next) {
  const food = await foodModel.findOneAndUpdate(
    { _id: req.params.id },
    {
      status: "Accepted",
    },
    { new: true }
  );
  await food.save();
  res.redirect("/all-donations");
});

router.get("/reject-food/:id", isLoggedin, async function (req, res, next) {
  const food = await foodModel.findOneAndUpdate(
    { _id: req.params.id },
    {
      status: "Rejected",
    },
    { new: true }
  );
  await food.save();
  res.redirect("/all-donations");
});

router.get("/upload", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("upload", { user: user });
});

router.get("/reviews", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });

  res.render("reviews", { user: user });
});

router.get("/add-reviews/:id", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const singleUser = await userModel.findOne({ _id: req.params.id });
  res.render("addReviews", { user: user, singleUser: singleUser });
});

router.post("/submit-review/:id", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOneAndUpdate(
    { _id: req.params.id },
    {
      reviews: {
        freshness: req.body.freshness,
        safetyAndHygiene: req.body.safetyAndHygiene,
        variety: req.body.variety,
        taste: req.body.taste,
        portionSize: req.body.portionSize,
        rating: req.body.rating,
        review: req.body.reviewText,
      },
    },
    { new: true }
  );
  await user.save();
  res.redirect("/all-donations");
});

router.get("/profile", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("profile", { user: user });
});

router.get("/user/:id", isLoggedin, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const singleUser = await userModel.findOne({ _id: req.params.id });
  res.render("user", { user: user, singleUser: singleUser });
});

router.post("/register", function (req, res) {
  const userData = new userModel({
    username: req.body.username,
    email: req.body.email,
  });

  userModel.register(userData, req.body.password, function (err) {
    if (err) {
      console.error("Username already exists", err);
      return res.redirect('/signup');
    }

    passport.authenticate("local")(req, res, function () {
      res.redirect("/editprofile");
    });
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/",
    failureFlash: true,
  }),
  function (req, res) {}
);

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

function isLoggedin(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}

module.exports = router;
