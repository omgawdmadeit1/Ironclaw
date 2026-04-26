import { Game } from "./game.js";

const canvas = document.getElementById("game");
const hud = document.getElementById("hud");
const overlay = document.getElementById("overlay");

const game = new Game(canvas, hud, overlay);
game.start();

window.neonFists = game;
