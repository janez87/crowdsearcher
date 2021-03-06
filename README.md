# CrowdSearcher

* [CrowdSearcher][cs]
* [Documentation][cs-doc]

## Requirements
* [node][node] 0.6+
* [mongodb][mongo] 2.2+ up and running.

## Installation
    git clone http://crowdsearcher.search-computing.org/gitlab/crowdsearcher/cs.git CrowdSearcher
    cd CrowdSearcher
    npm install -d

Now the **CrowdSearcher** can be started using `node cs.js`.
If you want to see the logs in a human readable form you need to install the `bunyan` package globally (Can require administrative privileges).
To do so type `npm install -g bunyan` and now you can start the **CrowdSearcher** using `npm start`.

## Configuration
All the configuration are stored in the `config/configuration.json` file.
Can be overridden by creating a `config/override.json` file to store needed configuration.

## To run
    cd *path/to/CrowdSearcher*
    npm start

## License Information

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

Commercial licenses are realeased upon request.
Free for Academic use.

## Problems
Contatc us!

- [Riccardo Volonterio][volox]
- [Andrea Mauri][janez]


[cs]: http://crowdsearcher.search-computing.org/ "CrowdSearcher"
[cs-doc]: http://crowdsearcher.search-computing.org/software "CrowdSearcher documentation"
[mongo]: http://www.mongodb.org "MongoDB"
[node]: http://nodejs.org "NodeJS"
[volox]: <mailto:riccardo.volonterio@polimi.it> "Riccardo Volonterio"
[janez]: <mailto:andrea.mauri@polimi.it> "Andrea Mauri"