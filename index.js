const { promises, writeFileSync } = require("fs");
const aes = require("aes-js");
const fzstd = require("fzstd");

const headers = {
    "Accept": "*/*",
    "Cache-Control": "no-cache",
    "pragma": "no-cache",
    "Host": "hub.vroid.com",
    "Sec-Ch-Ua": "\"Chromium\";v=\"92\", \" Not A;Brand\";v=\"99\", \"Google Chrome\";v=\"92\"",
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "X-Api-Version": 11,
    "TE": "trailers"
}

const unpad = (data) => {
    const paddingLength = data[data.length - 1];
    if (paddingLength <= 0 || paddingLength > data.length) {
        throw new Error(`Padding inválido: ${paddingLength}`);
    }
    return data.slice(0, -paddingLength);
};
/**
 * 
 * @param {Buffer} buffer 
 * @returns 
 */
async function decryptModel(buffer) {
    const iv = buffer.slice(0, 16);
    const key = buffer.slice(0, 32);
    // console.log("Last 16 bytes", encryptedHex.slice(-16));
    // console.log("Es múltiplo de 16:", encryptedHex.length % 16 === 0);

    const decryptor = new aes.ModeOfOperation.cbc(key, iv);
    //console.log("Datos desencriptados (hex):", decrypted.toString(CryptoJS.enc.Hex).slice(0, 64));

    const decryptedData = Buffer.from(decryptor.decrypt(buffer));
    writeFileSync("t", decryptedData);
    console.log("Last 16 bytes (Decrypted)", decryptedData.slice(-16));
    console.log("Buffer length", decryptedData.length);
    console.log("Last byte", decryptedData[decryptedData.length - 1]);
    

    const unpaddedData = unpad(decryptedData);
    console.log("unpadded", unpaddedData);

    console.log("Has magic number:", unpaddedData.includes(0xFD2FB528));
    const decompressedModel = fzstd.decompress(unpaddedData);
    return decompressedModel;
}

function getID(url) {
    try {
        const parsed = new URL(url);

        if (parsed.hostname !== "hub.vroid.com") return false;

        return parsed.pathname.slice(1).split("/")[4];
    } catch (error) {
        return false;
    }
}

async function main(url) {
    if (!url) throw new Error("You need to specify a valid VRoid URL");

    const modelId = getID(url);
    
    if (!modelId) throw new Error("The URL you provided is not valid or not from a VRoid HUB model.");

    const req = await fetch(`https://hub.vroid.com/api/character_models/${modelId}/optimized_preview`, {
        headers: Object.assign(headers, {
            "Cookie": "_vroid_session=6a19880bc31be900f6bfacb983463db7"
        })
    });

    if (!req.ok) throw new Error("The request failed. Did the cookie expire!?");

    const buffer = Buffer.from(await req.arrayBuffer(), "binary");
    console.log(buffer.length);
    const decrypted = await decryptModel(buffer);
    const sizeInMB = (decrypted.length / (1000 * 1000)).toFixed(2);

    await promises.writeFile(`models/${modelId}.vrm`, decrypted.buffer());

    console.log(`Saved model ${modelId}, size = ${sizeInMB}MB`);
}

main(process.argv[2]);