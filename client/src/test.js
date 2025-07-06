function promise(){
    return new promise(resolve,reject){
        if(3 == 3){
            return resolve('resolved')
        }
        else{
            return reject('not resolved')
        }
    }
}