const express = require('express');
const cors = require("cors");
const jwt = require('jsonwebtoken');
const passport = require("passport");
const passportJWT = require("passport-jwt");
const dotenv = require("dotenv");

dotenv.config();

const userService = require("./user-service.js");

const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

//vvvvvvvvvvvvvvvvvvvvvvvvvvv

//This is where a JWT strategy will be set up
let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

//Configure options
let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
jwtOptions.secretOrKey = process.env.JWT_SECRET;

let strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
    console.log('payload received', jwt_payload);

    if (jwt_payload) {
        next(null, {
            _id: jwt_payload._id,
            userName: jwt_payload.userName,
            role: jwt_payload.role
        });
    } else {
        next(null, false);
    }
});

passport.use(strategy);
app.use(passport.initialize());

//ʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌʌ

//This is extra
app.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
    res.send("Spotify server listening");
});


//User related methods
app.post('/api/user/register', (req, res) => {
    console.log("On register");
    console.log("req.body: "+ JSON.stringify(req.body));
    userService.registerUser(req.body).then(msg => {
        res.status(201).json({ "message": msg });
    }).catch(msg => {
        res.status(422).json({ "message": msg });
    });
});

app.post('/api/user/login', (req, res) => {
    /*In the function below, we check to make sure that the passed user object is valid
    ie: Password and Password 2 are the same. Once this process resolves, we then generate a 
    payload that will be used to generate the token. This token, once generated, will be sent back
    to the client to be stored locally. The server will then check each subsequent request with
    the passport method */
    userService.checkUser(req.body).then(user => {
        //Sign the payload and generate token
        let payload = {
            _id: user.id,
            userName: user.userName,
            role: user.role
        }
        let token = jwt.sign(payload, jwtOptions.secretOrKey);
        //This is where we return a json object with the token.
        res.json({ "message": "login successful", "token": token });
    }).catch(msg => {
        res.status(422).json({ "message": msg });
    });
});

app.get('/api/user/favourites', passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.getFavourites(req.user._id).then(userFavouriteList => {
        res.json(userFavouriteList);
    }).catch(msg => {
        res.json({ "error": msg });
    });
});

app.put('/api/user/favourites/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.addFavourite(req.user._id, req.params.id).then(userFavouriteList => {
        res.json(userFavouriteList);
    }).catch(msg => {
        res.json({ "error": msg });
    });
});

app.delete('/api/user/favourites/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.removeFavourite(req.user._id, req.params.id).then(userFavouriteList => {
        res.json(userFavouriteList);
    }).catch(msg => {
        res.json({ "error": msg });
    });
});

/* TODO Add Your Routes Here */

userService.connect()
    .then(() => {
        app.listen(HTTP_PORT, () => { console.log("API listening on: " + HTTP_PORT) });
    })
    .catch((err) => {
        console.log("unable to start the server: " + err);
        process.exit();
    });