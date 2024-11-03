![Room](Room-logo.svg)
# Room
**Room** est un module JavaScript qui permet de créer des interfaces utilisateurs réactives :

* sans outil de construction (build Tools),
* sans dépendance,
* sans **DOM Virtuel**,
* sans **JSX**.

**Room** est :

* simple avec **10** fonctions,
* ultra léger avec un fichier minifié de moins de **4 ko**,
* moderne et nativement développé en tant que module **ECMAScript 6**,
* open source sous licence **MIT** et le copyright et les droits d’auteur sont de [GreenerSoft](https://greenersoft.fr).

Room permet par ailleurs :

* de composer des interfaces utilisateurs en **HTML**, **SVG** et **MathML**,
* d’organiser le code en composants basés sur des fonctions,
* de gérer le cycle de vie des éléments avec la gestion d’évènements spéciaux comme `mount` et `unmount`.

**Room** est donc utilisable directement dans un navigateur pour dynamiser les pages Web.

## Exemple
En exemple, le classique composant **Counter** dont le code JavaScript est le suivant avec **Room** :

```javascript
import {elements, createData} from "Room";

function Counter() {
	const {div, strong, button} = elements();
	const count = createData(0);
	return div(
		"Compte = ", strong(count),
		button({onClick: () => count.value++}, "+"),
		button({onClick: () => count.value--}, "-")
	);
}

document.body.append(Counter());
```
## Plus d’informations
Retrouvez la documentation de référence de **Room** et de nombreux exemples sur le site [https://roomjs.fr](https://roomjs.fr)