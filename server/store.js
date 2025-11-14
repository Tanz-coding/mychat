const db=require("./db");
const util=require("./utils")
const fs=require('fs')
module.exports ={
  saveUser(user,status){
    console.log(user.name,status);
    if(status==='login'){
      return new Promise((resolve, reject) => {
        db.user.insert(user,(err,newUser) => {
          if(err){
            reject(err)
          }else {
            resolve(newUser)
          }
        })
      })
    }
  },
  saveMessage(from,to,message,type){
    if(type==='image'){
      const base64Data = message.replace(/^data:image\/\w+;base64,/, "")
      const dataBuffer = new Buffer.from(base64Data,'base64')
      const filename = util.MD5(base64Data)
      fs.writeFileSync(`./upload/${filename}.png`,dataBuffer)
      message=`/assets/images/${filename}.png`
    } else if (type === 'file') {
      // Assuming 'message' already contains the file path from the upload API
      // No need to save the file content here, as it's handled by the upload route
    }
    console.log("\x1b[36m"+from.name+"\x1b[0m对<\x1b[36m"+to.name+"\x1b[0m>:\x1b[32m"+message+"\x1b[0m")
    const doc={
      from,
      to,
      content:message,
      type,
      time:new Date().getTime()
    }
    return new Promise((resolve, reject) => {
      db.message.insert(doc,(err,newDoc) => {
        if(err){
          reject(err)
        }else {
          resolve(newDoc)
        }
      })
    })
  },
  getMessages() {
    return new Promise((resolve, reject) => {
      db.message.find({}).sort({time:1}).skip(0).limit(100).exec((err,docs) => {
        if(err){
          reject(err)
        }else {
          resolve(docs)
        }
      })
    })
  },
  getUsers(){
    return new Promise((resolve, reject) => {
      db.user.find({}).sort({time:1}).skip(0).limit(100).exec((err,docs) => {
        if(err){
          reject(err)
        }else {
          resolve(docs)
        }
      })
    })
  }
};
