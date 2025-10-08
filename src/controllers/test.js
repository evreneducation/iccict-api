import bcrypt from "bcrypt"

async function hashPass(pass) {
    return await bcrypt.hash(pass, 10);
}
async function printPass(){
    const hashedPass = await hashPass("icmmcs_super#@#");
    console.log(hashedPass);
}

printPass();