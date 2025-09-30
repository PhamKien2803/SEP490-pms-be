exports.getListStudent = async(req, res) => {
    try{
        return res.status(200).json("test");
    }catch(error){
        console.log("Error getListStudent", error);
        return res.status(500).json(error);
    }
}