// Russian typesetting: short words stay with the next word and a dash stays with the previous one,
// so no line ends on «в», «и» or «по», and none starts with «—».
const shortWord = /(?<=^|[\s«(])([а-яё]{1,2}|для|без|над|под|при|про) /giu;

export function nbsp(text: string) {
  return text.replace(shortWord, '$1 ').replace(/ —/g, ' —');
}
