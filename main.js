const Discord = require("discord.js");
const {prefix, token} = require("./config.json");
const ytdl = require("ytdl-core");
const yts = require("yt-search");



const client = new Discord.Client();

const queue = new Map();

client.once("ready", () => {
    console.log("Dönüşüm tamamlandı");
});

client.once("reconnecting", () => {
    console.log("Yeniden bağlanıyor");
});

client.once("disconnect", () => {
    console.log("Bağlantı kesildi");
});

client.on("message", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    } else {
        return;
    }
});

async function execute(message, serverQueue) {

    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "Sesli sohbet odasında olmadan yanına gelemem ki..."
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "HEY ÇABUK BANA GEREKLİ İZİNLERİ VERİN YOKSA MÜZİK YOK !!!"
        );
    }

    let song;
    if (ytdl.validateURL(args[1])) {
        const songInfo = await ytdl.getInfo(args[1]);
        song = {
            title: songInfo.title,
            url: songInfo.video_url
        };
    } else {
        const {videos} = await yts(args.slice(1).join(" "));
        if (!videos.length) return message.channel.send("No songs were found!");
        song = {
            title: videos[0].title,
            url: videos[0].url
        };
    }

    if (!serverQueue) {
        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueConstruct);

        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} sıraya eklendi`);
    }


}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Şarkıyı dinlemeden geçemezsin şekerim :)"
        );
    if (!serverQueue)
        return message.channel.send("Sıradakine geçmek isterdim ama sırada şarkı yok :(((");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Ah şekerim şarkıyı dinlemiyorsun ki durdurayım :)"
        );

    if (!serverQueue)
        return message.channel.send("Tam olarak neyi durdurmamı istiyorsun kalp ritimlerini mi ????");

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    try {
        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on("finish", () => {
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            })
            .on("error", error => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Şimdi oynatılıyor : **${song.title}**`);
    } catch (err) {
        serverQueue.textChannel.send("Youtube linki doğru değil")
    }


}


client.login(token);
