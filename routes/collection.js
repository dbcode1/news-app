const express = require('express')
const router = express.Router();
const session = require('express-session');
const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator');
const User = require('../models/User')
const Collection = require('../models/Collection')

router.post('/', [
    check('title', 'Please enter a title for your container').not().isEmpty()
],
 async (req, res) => {
  
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {userId} = req.session

        const user = await User.findById(userId)
        const { title } = req.body;

        const collection = new Collection ({
            title,
            date: Date.now()
        })

        const found = user.collections.find((item, index) => {

            if(item.title == title) {
                return true;
            }    
        });

        if(found) {
           return res.status(400).json('Collection exists')
        }else{
            user.collections.push(collection)
        }

        await user.save()
        res.sendStatus(200)

    } catch(err) {
        console.log(err)
    }

})

router.delete('/:id', async (req, res) => {
    const {userId} = req.session
    const user = await User.findById(userId)

    const found = user.collections.find((item, index) => {
        if(item._id == req.params.id) {
            return true
        }
    })

    user.collections.splice(found, 1)

    await user.save() 
    console.log(user)
    res.sendStatus(200)
})

module.exports = router;