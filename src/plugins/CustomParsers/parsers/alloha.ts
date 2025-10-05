import { Parser, IDirectLinks } from "../types";
import { returnLinkToHLSProxy } from "../utils";

const FINGER_HASH = "9d19cc5670244fa7bf9e9d970681d33be3a0daaf333401aa4e9d402effe10db0";

/**
 * Оригинальные функции для декодирования токена
 */
function xorShuffle(cD: string, I0: boolean = false): string {
  var I1 = cD.length;
  if (I1 <= 1) {
    return cD;
  }
  for (var I2 = 1, I3 = 0; I2 < I1;) {
    I2 *= 7;
    I3++;
  }
  for (var I4 = function (Ix: number) {
    for (var IA = 0, Ih = 0; Ih < I3; Ih++) {
      IA = IA * 7 + Ix % 7;
      Ix = Math.floor(Ix / 7);
    }
    return IA;
  }, I5 = new Array(I1), I6 = 0; I6 < I1; I6++) {
    var I7 = I6;
    var I8 = I6;
    for (; ;) {
      var I9 = I4(I7);
      if (I9 < I1) {
        I5[I6] = I9;
        break;
      }
      if ((I7 = I9) === I8) {
        I5[I6] = I6;
        break;
      }
    }
  }
  for (var If = new Array(I1), IT = 0; IT < I1; IT++) {
    If[I5[IT]] = IT;
  }
  for (var Iz = new Array(I1), Ic = 0; Ic < I1; Ic++) {
    Iz[If[Ic]] = cD[Ic];
  }
  var II = Iz.join("");
  if (I0 && II.length > 1) {
    II = II.slice(1) + II[0];
  }
  return II;
}

function modularEncode(cD: string, I0: boolean = false): string {
  var I1 = cD.length;
  if (I1 <= 1) {
    return cD;
  }
  for (var I2 = [2, 3, 5, 8, 13, 21], I3 = "", I4 = 0, I5 = 0; I4 < I1; I5++) {
    for (var I6 = Math.min(I2[I5 % I2.length], I1 - I4), I7 = cD.slice(I4, I4 + I6), I8 = new Array(I6), I9 = 0; I9 < I6; I9++) {
      I8[I9] = I9 % 2 == 0 ? I9 >> 1 : I6 - 1 - (I9 >> 1);
    }
    for (var If = new Array(I6), IT = 0; IT < I6; IT++) {
      If[I8[IT]] = I7[IT];
    }
    I3 += If.join("");
    I4 += I6;
  }
  if (I0 && I3.length > 1) {
    I3 = I3.slice(1) + I3[0];
  }
  return I3;
}

function pseudoRandomShuffle(If: string, IT: boolean = false): string {
  var Iz = If.length;
  if (Iz <= 1) {
    return If;
  }
  for (var Ic = function (Iw: number, Iu: number) {
    return (Iw * Iw * 1103515245 + Iw * 12345 + Iu * 2654435761 >>> 0 & 4294967295) >>> 0;
  }, II = [], Ix = 0; Ix < Iz; Ix++) {
    II.push({
      i: Ix,
      k: Ic(Ix, Iz)
    });
  }
  II.sort(function (Iw, Iu) {
    if (Iw.k === Iu.k) {
      return Iw.i - Iu.i;
    } else {
      return Iw.k - Iu.k;
    }
  });
  for (var IA = II.map(function (Iw) {
    return Iw.i;
  }), Ih = new Array(Iz), Ik = 0; Ik < Iz; Ik++) {
    Ih[IA[Ik]] = Ik;
  }
  for (var Iq = new Array(Iz), Io = 0; Io < Iz; Io++) {
    Iq[Io] = If[Ih[Io]];
  }
  var IZ = Iq.join("");
  if (IT && IZ.length > 1) {
    IZ = IZ.slice(-1) + IZ.slice(0, -1);
  }
  return IZ;
};


const Alloha: Parser = {
    name: "Alloha",
    type: "alloha",
    async parseEpisode(link: URL): Promise<IDirectLinks | null> {
        try {
            const playerFrame = await fetch(link, {
                headers: {
                    "Referer": link.href
                }
            })

            const text = await playerFrame.text();

            const jsonSettingsMatch = /const\s*config\s*=\s*JSON\.parse\('(?<Result>[^']+)'\)/g;
            const idMatch = /const\s*fileList\s*=\s*JSON\.parse\('{"type":"serial","active":{"id":(?<Result>\d+),/g;
            const userTokenMatch = /<meta\s*name="viewporti"\s*content="(?<Result>[^"]+)">/g;
            const baseTokenMatch = /token:\s*'(?<Result>[^']+)'/g;
            const baseDomainMatch = /domain:\s*'(?<Result>[^']+)'/g;

            const jsonString = JSON.parse(jsonSettingsMatch.exec(text)?.groups?.Result ?? '{}');
            const id = idMatch.exec(text)?.groups?.Result;
            const userToken = userTokenMatch.exec(text)?.groups?.Result;
            const baseToken = baseTokenMatch.exec(text)?.groups?.Result;
            const baseDomain = baseDomainMatch.exec(text)?.groups?.Result;

            if ((!baseToken && !baseDomain) || !userToken || !id) return null;

            const accessToken = pseudoRandomShuffle(modularEncode(xorShuffle(userToken, false), false), false);

            const directLinks = await fetch(`https://alloha.yani.tv/oqs/movies/${id}`, {
                method: "POST",
                body: `token=${jsonString?.ads?.replace ? jsonString?.ads?.replace['[token]'] : baseToken}&av1=true&autoplay=0&audio=&subtitle=`,
                headers: {
                    "Referer": decodeURIComponent(jsonString?.ads?.replace ? jsonString?.ads?.replace['[domain]'] : baseDomain),
                    "Origin": "https://alloha.yani.tv",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Borth": `${FINGER_HASH}|${accessToken}`,
                },
                referrerPolicy: "no-referrer-when-downgrade"
            });

            const result = await directLinks.json();
            if (!result) return null;

            for (const [key, value] of Object.entries(result.hlsSource[0].quality)) {
                const val = result.hlsSource[0].quality[key].split("or")[0].trim();
                result.hlsSource[0].quality[key] = returnLinkToHLSProxy(btoa(`${val}|https://alloha.yani.tv`));
            }

            let resultLinks: IDirectLinks = {
                master: result.hlsSource[0].quality[Object.keys(result.hlsSource[0].quality)[0]],
                quality: result.hlsSource[0].quality
            };

            return resultLinks;
        } catch (err) {
            return null;
        }
    }
}

export default Alloha;