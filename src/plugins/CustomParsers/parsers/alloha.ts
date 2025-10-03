import { Parser, IDirectLinks } from "../types";
import { returnLinkToHLSProxy } from "../utils";

const FINGER_HASH = "9d19cc5670244fa7bf9e9d970681d33be3a0daaf333401aa4e9d402effe10db0";

/**
 * Оригинальные функции для декодирования токена
 */
function xorShuffle(Nl: string, Ns: boolean = false): string {
    var NG = Nl.length;
    if (NG <= 1) {
        return Nl;
    }
    for (var NT = 1; NT < NG;) {
        NT <<= 1;
    }
    for (var S0 = [], S1 = 1; S1 < NT; S1 <<= 1) {
        S0.push(S1);
    }
    for (var S2 = Nl.split(""), S3 = S0.length - 1; S3 >= 0; S3--) {
        for (var S4 = S0[S3], S5 = 0; S5 < NT; S5++) {
            var S6 = S5 ^ S4;
            if (S5 < S6 && S5 < NG && S6 < NG) {
                var S7 = S2[S5];
                S2[S5] = S2[S6];
                S2[S6] = S7;
            }
        }
    }
    var S8 = S2.join("");
    if (Ns && S8.length > 1) {
        S8 = S8.slice(-1) + S8.slice(0, -1);
    }
    return S8;
}

function modularEncode(Nl: string, Ns: boolean = false): string {
    for (var NG = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._~", NT = Object.create(null), S0 = 0; S0 < 66; S0++) {
        NT[NG[S0]] = S0;
    }
    for (var S1 = Nl.length, S2 = "", S3 = 0; S3 < S1; S3 += 2) {
        var S4 = Nl[S3];
        var S5 = S3 + 1 < S1 ? Nl[S3 + 1] : "";
        var S6 = NT[S4];
        var S7 = S5 ? NT[S5] : undefined;
        if (S5 && S6 !== undefined && S7 !== undefined) {
            var S8 = S3 / 2 | 0;
            var S9 = S7 - (S6 * 5 + (S8 * 11 + 1)) % 66;
            if (S9 < 0) {
                S9 += 66;
            }
            var SI = S6 - (S9 * 11 + (S8 * 7 + 3)) % 66;
            if (SI < 0) {
                SI += 66;
            }
            S2 += NG[SI] + NG[S9];
        } else {
            S2 += S4 + S5;
        }
    }
    if (Ns && S2.length > 1) {
        S2 = S2.slice(1) + S2[0];
    }
    return S2;
}

function pseudoRandomShuffle(S7: string, S8: boolean = false): string {
    var S9 = S7.length;
    if (S9 <= 1) {
        return S7;
    }
    for (var SI = function (Su: number, Sz: number) {
        return (Su * Su * 1103515245 + Su * 12345 + Sz * 2654435761 >>> 0 & 4294967295) >>> 0;
    }, Sx = [], Sg = 0; Sg < S9; Sg++) {
        Sx.push({
            i: Sg,
            k: SI(Sg, S9)
        });
    }
    Sx.sort(function (Su, Sz) {
        if (Su.k === Sz.k) {
            return Su.i - Sz.i;
        } else {
            return Su.k - Sz.k;
        }
    });
    for (var SO = Sx.map(function (Su) {
        return Su.i;
    }), SN = new Array(S9), SS = 0; SS < S9; SS++) {
        SN[SO[SS]] = SS;
    }
    for (var SA = new Array(S9), SX = 0; SX < S9; SX++) {
        SA[SX] = S7[SN[SX]];
    }
    var Sk = SA.join("");
    if (S8 && Sk.length > 1) {
        Sk = Sk.slice(-1) + Sk.slice(0, -1);
    }
    return Sk;
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

            const directLinks = await fetch(`https://alloha.yani.tv/aqs/movies/${id}`, {
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