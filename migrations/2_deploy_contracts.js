const SkiTicketNFT = artifacts.require("SkiTicketNFT");

module.exports = function (deployer) {
    deployer.deploy(SkiTicketNFT);
};