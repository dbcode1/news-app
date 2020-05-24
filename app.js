const express = require('express');
var path=require('path');
const session = require('express-session');
const multer = require('multer')
const bodyParser = require('body-parser')
const TWO_HOURS = 1000 * 60 * 60 * 2;
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const app = express();

const {
	SESS_NAME = 'sid',
	SESS_SECRET = 'sJsEqteqds',
	PORT = 3000,
	SESS_LIFETIME = TWO_HOURS,
	NODE_ENV = 'development',
} = process.env;

const IN_PROD = NODE_ENV === 'production';

// TODO: Connect to DB
const Users = [];

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(
	session({
		name: SESS_NAME,
		resave: false,
		saveUninitialized: false,
		secret: SESS_SECRET,
		cookie: {
			maxAge: SESS_LIFETIME,
			sameSite: true,
			secure: IN_PROD,
		},
	})
);

const redirectLogin = (req, res, next) => {
	if (!req.session.userId) {
		res.redirect('/login');
	} else {
		next();
	}
};

const redirectHome = (req, res, next) => {
	if (req.session.userId) {
		res.redirect('/home');
	} else {
		next();
	}
};

app.use((req, res, next) => {
	const { userId } = req.session;
	if (userId) {
		res.locals.user = Users.find((user) => user.id === userId);
	}
	next();
});

app.get('/all', (req, res) => {
	res.send(Users);
});

app.post('/delete-user', (req, res) => {
	console.log('delete');
	const { user } = res.locals; // ****
	// find the index of the user in Users then delete
	
	const index = Users.findIndex((user) => user.id === req.session.userId);
	if(index >= 0) {Users.splice(index, 1);}
	
	res.send(Users)
	//return res.redirect('/');
	console.log(Users);
});

app.get('/', (req, res) => {
	const { user } = res.locals;


	const userId = user.id;

	res.send(`
	  <h1>Welcome!</h1>
	  ${
			userId
				? `
	  <a href='/home'>Home</a>
	  <form method='post' action='/logout'>
	    <button>Logout</button>
		</form>

	  `
				: `
	  <a href='/login'> Login</a>
	  <a href='/register'>Register</a>
	  `
		}

	  `);
});

app.get('/home', redirectLogin, (req, res) => {
	const { user } = res.locals;
	console.log(user);

	res.send(`
	  <h1>Home</h1>
		<a href='/'>Main</a>
		${
			user
				? `
	  <ul>
	    <li>Name: ${user.name}</li>
	    <li>Email: ${user.email}</li>

		</ul>`
				: ` ${''}`
		}
		<form method="post" action="/delete-user">
			<p> Delete User </p>
			<input type="submit" />
		</form>
	`);
});

app.get('/profile', redirectLogin, (req, res) => {
	const { user } = res.locals;
});

app.get('/login', redirectHome, (req, res) => {
	console.log('login - Users', Users);
	res.send(`
    <h1>Login</h1>
    <form method="post" action="/login">
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="password" require />
      <input type="submit" />
		</form> 
		
    <a href="/register" > Register</a>`);
});

app.get('/register', (req, res) => {
	res.send(`
  <h1>Register</h1>
  <form method="post" action="/register">
    <input type="text" name="name" placeholder="Name" required />
    <input type="email" name="email" placeholder="Email" required />
    <input type="password" name="password" placeholder="password" require />
    <input type="submit" />
  </form> 
  <a href="/login" > Login</a>`);
});

// counter
app.get('/counter', (req, res) => {
	if (req.session.page_views) {
		req.session.page_views++;
		res.send('You visited this page ' + req.session.page_views + ' times');
	} else {
		req.session.page_views = 1;
		res.send('Welcome to this page for the first time!');
	}
});


// LOGIN //

app.post(
	'/login', bodyParser,
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
			const userLogged = Users.find(({ email }) => email === email);

			const isMatch = await bcrypt.compare(password, userLogged.password);

			if (userLogged && isMatch) {
				// set id on session param userId
				req.session.userId = userLogged.id;
				req.user = userLogged;
				res.send(userLogged)  // test
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

// GET USER //

app.get('/user', (req, res) => {
	try {
		// MONGO look up from DB
		let userLogged = Users.some((user) => { user.id === req.user.id})
		//const user = await User.findById(req.user.id).select('-password');
		res.json(userLogged);
	  } catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	  }
})

// LOGOUT //

app.get('/logout', (req, res) => {
		if (req.session){
			// MONGO delete from DB
			req.session.destroy()
		
			res.send('user logout')
		} else {
			console.log('bad')
		}
	
})

app.post(
	'/register', //bodyParser,
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
			let user = Users.some((user) => {
				user.email === email;
			});

			if (user) {
				return res
					.status(400)
					.json({ errors: [{ msg: 'User already exists' }] });
			}

			user = {
				id: uuidv4(),
				name,
				email,
				password, // needs hashing
			};

			const salt = await bcrypt.genSalt(10);
			
			user.password = await bcrypt.hash(password, salt);

			//await user.save();

			//  TODO: save to database
			await Users.push(user);


			req.user = user;
			req.session.userId = user.id;

			res.send(req.session.id)

			//res.status(200).json('user created')

			//return res.redirect('/home'); REACT
		} catch (err) {
			console.log(err.message);
			res.status(500).send('Server error');
		}
	}
);

app.post('/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return res.redirect('/home');
		}

		res.clearCookie(SESS_NAME);
		res.redirect('/login');
	});
});

app.listen(PORT, (req, res) => {
	console.log(`http://localhost:${PORT}`);
});
