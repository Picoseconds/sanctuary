### This file lists frequently asked questions and resolves them (hopefully) 

***1. "Where can I run this server? (besides my computer)"***

Glitch is probably the easiest way to host one of these servers. It is recommended that you disable projectiles because it tends to create lag. You can also use Repl.it, as it's pretty stable. If you want to use glitch, fork this repo and then import it on glitch. Configure the .env file and then you should be fine. If the server doesn't run open the terminal in the glitch project and follow the steps provided in the readme file. Then edit the sanctuary.user.js websocket constructor to conform to your glitch project name (not in the project itself though)

***2. "How do I connect to my server?"***

You may connect to your server by modifying and injecting [sanctuary.user.js](https://github.com/Picoseconds/sanctuary/blob/master/sanctuary.user.js). Edit the websocket constructor to conform to your glitch project name. (not in the project itself though)


**Example A:**

**Before:*

_Un-modified sanctuary.user.js_ <br>
![](https://cdn.discordapp.com/attachments/452951686751977473/785663363404660736/Screenshot_2020_12_07_19_24_492x.png)


**After:**

_Modified sanctuary.user.js_ <br>
![](https://cdn.discordapp.com/attachments/452951686751977473/785669534207311882/Screenshot_2020_12_07_19_31_402x.png)

**Example B(if you imported on repl.it)**


![](https://cdn.discordapp.com/attachments/452951686751977473/785670425211699260/Screenshot_2020_12_07_19_51_172x.png)

                                                                                                                                                                        
3. **"I'm hosting it locally, how can others join without seeing my ip address?"**

Your best bet is to host it on an online website, which adds even more perks than hiding your ip address. Note that you are sharing you public ip address, and there 
is not much people can do with it. You can also use a floating ip which directs internet traffic to your ip, yet that is most likely going to cost you. (Ex: glitch.com, repl.it)

4. **"How can I keep the server running at all times?"**

The answer is the same as the last: Host it online using a project-hosting service such as glitch.com. It constantly runs unless there is no user activity. The only 
downside to this is that it is laggy due to the limited CPU and Ram allocated to the project. (Ex: glitch.com, repl.it)

5. **"How can I connect without a userscript? (a.k.a just via the website)"**

You must create another glitch.me project and then port it that way using either node.js, socket.io, or express.
