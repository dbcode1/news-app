const express = require('express');
const router = express.Router();
const path = require('path');

const session = require('express-session');
const multer = require('multer')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');


// router.use for locals

// HOME //
// router.get('/', (req, res) => {
//     res.send('home')
// })  

// GET ALL USERS  //
// router.get('/all', (req, res) => {
// 	res.send(Users);
// });


// REGISTER //
router.post(
	'/', 
	[
		check('name', 'Name is required').not().isEmpty(),
		check('email', 'Please include a valid email').isEmail(),
		check(
			'password',
			'Please enter a password with 6 or more characters'
		).isLength({ min: 6 }),
	],
	async (req, res) => {
		console.log('reg', req.body)
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			console.log(errors.array());
			return res.status(400).json({ errors: errors.array() });
		}

		const { name, email, password } = req.body;
		
		try {

            let user = await User.findOne({ email })
    
            if (user) {
				return res
					.status(400)
					.json({ errors: [{ msg: 'User already exists' }] });
            }
            
			// let user = Users.some((user) => {
			// 	user.email === email;
			// });

			user = new User({
				name,
				email,
                password, // needs hashing
                date: Date.now()
			})

			const salt = await bcrypt.genSalt(10);
			
            user.password = await bcrypt.hash(password, salt);
            
            console.log( req.session.id, user.id)
            req.user = user;
			req.session.userId = user.id;

            await user.save();
            
            res.send(req.session.id).status(200)

			//return res.redirect('/home'); REACT
		} catch (err) {
			//console.log(err.message);
			res.status(500).json('Server error');
		}
	}
);

// LOGIN //
router.post(
	'/login',
	[
		check('email', 'Please include a valid email').isEmail(),
		check(
			'password',
			'Please enter a password with 6 or more characters'
		).exists(),
	],
	async (req, res) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

        const { email, password } = req.body;
      

		try {
            let user = await User.findOne({ email })

			const isMatch = await bcrypt.compare(password, user.password);

            // if !isMatch TODO:
            
            console.log(req.session.id)

			if (user && isMatch) {
				// set id on session param userId
				//req.session.userId = user.id;
				req.user = user;
				res.send(user)  // test
				//res.status(200).json('user logged in')
				//return res.redirect('/home'); REACT
			}

			// res.redirect('/login'); REACT
		} catch (err) {
			console.log(err.message);
			res.status(400).json({
				error: {
					msg: 'Invalid Credentials',
				},
			});

			//res.redirect('/login'); REACT
		}
	}
);

// LOGOUT //
router.post('/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return res.json({err});
		}

		res.clearCookie('sid') // TODO: SESS_NAME
		res.redirect('/login');
	});
});


module.exports = router;