import type { Bi, Lang } from '../../shared/i18n';
import { pick, shuffle, type Rng } from '../../shared/rng';

export interface Word {
  emoji: string;
  answer: Bi;
  clue: Bi;
}

export const WORDS: readonly Word[] = [
  // 4-letter words (early steps)
  { emoji: '🏠', answer: { es: 'casa', en: 'house' }, clue: { es: 'Un lugar donde vive una familia.', en: 'A place where a family lives.' } },
  { emoji: '🐈', answer: { es: 'gato', en: 'cat' }, clue: { es: 'Un animal que ronronea.', en: 'An animal that purrs.' } },
  { emoji: '🌙', answer: { es: 'luna', en: 'moon' }, clue: { es: 'Brilla en el cielo por la noche.', en: 'It shines in the night sky.' } },
  { emoji: '☁️', answer: { es: 'nube', en: 'cloud' }, clue: { es: 'Flota blanca en el cielo y trae lluvia.', en: 'It floats white in the sky and brings rain.' } },
  { emoji: '🦆', answer: { es: 'pato', en: 'duck' }, clue: { es: 'Nada en el estanque y dice cuac.', en: 'It swims in the pond and says quack.' } },
  { emoji: '🐸', answer: { es: 'rana', en: 'frog' }, clue: { es: 'Salta muy alto cerca del agua.', en: 'It leaps high near the water.' } },
  { emoji: '🐺', answer: { es: 'lobo', en: 'wolf' }, clue: { es: 'Un animal salvaje que aúlla a la luna.', en: 'A wild animal that howls at the moon.' } },
  { emoji: '🗺️', answer: { es: 'mapa', en: 'map' }, clue: { es: 'Un dibujo que muestra caminos y tesoros.', en: 'A drawing that shows roads and treasure.' } },
  { emoji: '🏝️', answer: { es: 'isla', en: 'island' }, clue: { es: 'Tierra rodeada de agua por todas partes.', en: 'Land surrounded by water on every side.' } },
  { emoji: '🗼', answer: { es: 'faro', en: 'lighthouse' }, clue: { es: 'Una torre con luz que guía a los barcos.', en: 'A tall tower with a light that guides ships.' } },
  { emoji: '🚂', answer: { es: 'tren', en: 'train' }, clue: { es: 'Viaja sobre raíles de una estación a otra.', en: 'It travels on rails from station to station.' } },
  { emoji: '🌷', answer: { es: 'flor', en: 'flower' }, clue: { es: 'Crece en el jardín y tiene pétalos de colores.', en: 'It grows in the garden and has colourful petals.' } },
  { emoji: '🕯️', answer: { es: 'vela', en: 'candle' }, clue: { es: 'Da una pequeña llama en la oscuridad.', en: 'It gives a little flame in the dark.' } },
  { emoji: '🪺', answer: { es: 'nido', en: 'nest' }, clue: { es: 'La casa de ramitas donde viven los pájaros.', en: 'The twig home where birds live.' } },

  // 5-letter words
  { emoji: '📚', answer: { es: 'libro', en: 'book' }, clue: { es: 'Tiene páginas llenas de historias.', en: 'It has pages full of stories.' } },
  { emoji: '🏖️', answer: { es: 'playa', en: 'beach' }, clue: { es: 'Tiene arena y olas.', en: 'It has sand and waves.' } },
  { emoji: '🧀', answer: { es: 'queso', en: 'cheese' }, clue: { es: 'Comida amarilla hecha de leche.', en: 'A yellow food made from milk.' } },
  { emoji: '🔥', answer: { es: 'fuego', en: 'fire' }, clue: { es: 'Da calor y luz en una hoguera.', en: 'It gives warmth and light in a campfire.' } },
  { emoji: '🐕', answer: { es: 'perro', en: 'dog' }, clue: { es: 'Un amigo fiel que mueve la cola.', en: 'A loyal friend that wags its tail.' } },
  { emoji: '🐯', answer: { es: 'tigre', en: 'tiger' }, clue: { es: 'Un gran felino con rayas naranjas y negras.', en: 'A big cat with orange and black stripes.' } },
  { emoji: '🦊', answer: { es: 'zorro', en: 'fox' }, clue: { es: 'Un animal astuto de cola peluda.', en: 'A clever animal with a bushy tail.' } },
  { emoji: '🐙', answer: { es: 'pulpo', en: 'octopus' }, clue: { es: 'Vive en el mar y tiene ocho brazos.', en: 'It lives in the sea and has eight arms.' } },
  { emoji: '🐼', answer: { es: 'panda', en: 'panda' }, clue: { es: 'Un oso blanco y negro al que le encanta el bambú.', en: 'A black and white bear that loves bamboo.' } },
  { emoji: '🦓', answer: { es: 'cebra', en: 'zebra' }, clue: { es: 'Parece un caballo con pijama de rayas.', en: 'It looks like a horse in stripy pyjamas.' } },
  { emoji: '🐝', answer: { es: 'abeja', en: 'bee' }, clue: { es: 'Vuela de flor en flor y fabrica miel.', en: 'It flies from flower to flower and makes honey.' } },
  { emoji: '🍓', answer: { es: 'fresa', en: 'strawberry' }, clue: { es: 'Una fruta roja, dulce y con puntitos.', en: 'A sweet red fruit covered in tiny seeds.' } },
  { emoji: '⛵', answer: { es: 'barco', en: 'ship' }, clue: { es: 'Navega por el mar empujado por el viento.', en: 'It sails across the sea pushed by the wind.' } },
  { emoji: '🎈', answer: { es: 'globo', en: 'balloon' }, clue: { es: 'Se llena de aire y flota en las fiestas.', en: 'It fills with air and floats at parties.' } },
  { emoji: '⏰', answer: { es: 'reloj', en: 'clock' }, clue: { es: 'Tiene agujas y nos dice qué hora es.', en: 'It has hands and tells us the time.' } },
  { emoji: '🤖', answer: { es: 'robot', en: 'robot' }, clue: { es: 'Una máquina inteligente que sigue instrucciones.', en: 'A clever machine that follows instructions.' } },
  { emoji: '❄️', answer: { es: 'nieve', en: 'snow' }, clue: { es: 'Cae blanca y fría en invierno.', en: 'It falls white and cold in winter.' } },
  { emoji: '🪶', answer: { es: 'pluma', en: 'feather' }, clue: { es: 'Es muy ligera y cubre las alas de las aves.', en: "It is very light and covers birds' wings." } },

  // 6-8 letter words (later steps)
  { emoji: '🏴‍☠️', answer: { es: 'pirata', en: 'pirate' }, clue: { es: 'Navega en barco buscando tesoros.', en: 'Sails on a ship looking for treasure.' } },
  { emoji: '🚀', answer: { es: 'cohete', en: 'rocket' }, clue: { es: 'Despega hacia el espacio con mucho ruido.', en: 'It blasts off into space with a loud roar.' } },
  { emoji: '💎', answer: { es: 'tesoro', en: 'treasure' }, clue: { es: 'Un cofre lleno de joyas y monedas brillantes.', en: 'A chest full of shiny jewels and coins.' } },
  { emoji: '👑', answer: { es: 'corona', en: 'crown' }, clue: { es: 'La llevan reyes y reinas en la cabeza.', en: 'Kings and queens wear it on their heads.' } },
  { emoji: '🦒', answer: { es: 'jirafa', en: 'giraffe' }, clue: { es: 'El animal con el cuello más largo de la sabana.', en: 'The animal with the longest neck on the savannah.' } },
  { emoji: '🍦', answer: { es: 'helado', en: 'ice cream' }, clue: { es: 'Un postre frío que se derrite al sol.', en: 'A cold treat that melts in the sun.' } },
  { emoji: '🪞', answer: { es: 'espejo', en: 'mirror' }, clue: { es: 'Cuando te miras en él, te devuelve tu reflejo.', en: 'When you look into it, it shows your reflection.' } },
  { emoji: '🌉', answer: { es: 'puente', en: 'bridge' }, clue: { es: 'Sirve para cruzar un río sin mojarse.', en: 'It helps you cross a river without getting wet.' } },
  { emoji: '🪐', answer: { es: 'planeta', en: 'planet' }, clue: { es: 'Un mundo redondo que gira alrededor de una estrella.', en: 'A round world that orbits around a star.' } },
  { emoji: '🍎', answer: { es: 'manzana', en: 'apple' }, clue: { es: 'Una fruta crujiente que puede ser roja o verde.', en: 'A crunchy fruit that can be red or green.' } },
  { emoji: '🎒', answer: { es: 'mochila', en: 'backpack' }, clue: { es: 'Se lleva a la espalda con libros o merienda.', en: 'You carry it on your back with books or snacks.' } },
  { emoji: '🐳', answer: { es: 'ballena', en: 'whale' }, clue: { es: 'El animal gigante que canta bajo el océano.', en: 'The giant animal that sings beneath the ocean.' } },
  { emoji: '⭐', answer: { es: 'estrella', en: 'star' }, clue: { es: 'Un punto brillante que vemos en el cielo.', en: 'A bright spot we can see in the sky.' } },
  { emoji: '🐢', answer: { es: 'tortuga', en: 'turtle' }, clue: { es: 'Un animal lento que lleva su casa a la espalda.', en: 'A slow animal that carries its home on its back.' } },
  { emoji: '🦋', answer: { es: 'mariposa', en: 'butterfly' }, clue: { es: 'Un insecto de alas coloridas.', en: 'An insect with colourful wings.' } },
  { emoji: '🏰', answer: { es: 'castillo', en: 'castle' }, clue: { es: 'Una gran fortaleza de piedra con torres altas.', en: 'A grand stone fortress with tall towers.' } },
  { emoji: '🐘', answer: { es: 'elefante', en: 'elephant' }, clue: { es: 'Un animal enorme con trompa y orejas grandes.', en: 'A huge animal with a trunk and big ears.' } },
  { emoji: '🔦', answer: { es: 'linterna', en: 'torch' }, clue: { es: 'Ilumina el camino cuando entras en una cueva.', en: 'It lights the way when you step into a cave.' } },
  { emoji: '🎸', answer: { es: 'guitarra', en: 'guitar' }, clue: { es: 'Un instrumento musical con seis cuerdas.', en: 'A musical instrument with six strings.' } },
  { emoji: '🎩', answer: { es: 'sombrero', en: 'hat' }, clue: { es: 'Se pone en la cabeza para protegerse o ir elegante.', en: 'You wear it on your head for shade or style.' } },
];

export interface LetterTile {
  id: number;
  letter: string;
}

export interface WordPuzzle extends Word {
  tiles: LetterTile[];
}

export const WORD_ROUND_LENGTH = 5;

const wordLength = (word: Word, lang: Lang): number => word.answer[lang].length;

/** Generates a word puzzle progressing from shorter (4-5) to longer (6-9) words for ages 8-12. */
export function generateWordPuzzle(
  rng: Rng,
  index: number,
  lang: Lang,
  exclude: readonly string[] = [],
): WordPuzzle {
  const candidates = WORDS.filter((w) => !exclude.includes(w.emoji));
  const poolBase = candidates.length ? candidates : WORDS;
  const filtered = poolBase.filter((word) => {
    const length = wordLength(word, lang);
    if (index < 2) return length <= 5;
    if (index < 4) return length >= 5 && length <= 7;
    return length >= 6;
  });
  const word = pick(rng, filtered.length ? filtered : poolBase);
  const answer = word.answer[lang];
  const extraCount = index < 2 ? 2 : index < 4 ? 3 : 4;
  const distractors = Array.from({ length: extraCount }, () =>
    pick(rng, [...'abcdefgilmnoprstuv']));
  const letters = shuffle(rng, [...answer, ...distractors]);
  return { ...word, tiles: letters.map((letter, id) => ({ id, letter })) };
}

export function selectedWord(puzzle: WordPuzzle, selectedIds: readonly number[]): string {
  return selectedIds.map((id) => puzzle.tiles.find((tile) => tile.id === id)?.letter ?? '').join('');
}

export function isWordSolved(puzzle: WordPuzzle, selectedIds: readonly number[], lang: Lang): boolean {
  return selectedWord(puzzle, selectedIds).toLowerCase() === puzzle.answer[lang].toLowerCase();
}

export function wordClue(puzzle: WordPuzzle, lang: Lang): string {
  return puzzle.clue[lang];
}

export function wordLetterCount(puzzle: WordPuzzle, lang: Lang): number {
  return puzzle.answer[lang].length;
}

export function wordMistake(attempt: string, rng: Rng): Bi {
  const shown = attempt.toUpperCase();
  return pick(rng, [
    { es: `🦉 ¿«${shown}»? ¡Eso suena a estornudo de dragón! 🐉`, en: `🦉 "${shown}"? That sounds like a dragon sneezing! 🐉` },
    { es: `🪶 ¡Casi! «${shown}» parece una palabra inventada por un pato. 🦆`, en: `🪶 Almost! "${shown}" sounds like a word made up by a duck. 🦆` },
    { es: `🧙 ¿«${shown}»? ¡Cuidado, casi conjuras una rana gigante! 🐸`, en: `🧙 "${shown}"? Careful, you nearly summoned a giant frog! 🐸` },
    { es: `🛸 ¡Bip-bop! «${shown}» suena a saludo de otro planeta. 👽`, en: `🛸 Beep-boop! "${shown}" sounds like a greeting from outer space. 👽` },
    { es: `🦉 Berta ladea la cabeza: «${shown}» no está en su diccionario mágico. 📖`, en: `🦉 Berta tilts her head: "${shown}" is not in her magic dictionary. 📖` },
    { es: `🎶 «${shown}» suena a canción de pingüino con hipo. 🐧`, en: `🎶 "${shown}" sounds like a penguin singing with hiccups. 🐧` },
    { es: `🏴‍☠️ ¡Arrr! «${shown}» parece la contraseña secreta de un loro. 🦜`, en: `🏴‍☠️ Arrr! "${shown}" sounds like a parrot's secret password. 🦜` },
    { es: `🍰 ¿«${shown}»? ¡Suena al nombre de un pastel de galaxia! ✨`, en: `🍰 "${shown}"? That sounds like the name of a galaxy cake! ✨` },
  ]);
}
