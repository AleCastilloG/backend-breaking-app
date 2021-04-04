import { IResolvers } from 'graphql-tools';
import { Datetime } from '../lib/datetime';
import { Db } from 'mongodb';
import { COLLECTIONS, CHANGE_VOTES } from '../config/constants';
import {
  asignVoteId,
  getCharacter,
  getCharacters,
  getVote,
} from '../lib/database-operations';
import { PubSub } from 'apollo-server-express';

async function response(status: boolean, message: string, db: Db) {
  return {
    status,
    message,
    characters: await getCharacters(db),
  };
}

async function sendNotification(pubsub: PubSub, db: Db) {
  // evento que queremos publicar
  // pasar la definicion (en este caso el nombre del subscription changeVotes)
  pubsub.publish(CHANGE_VOTES, { changeVotes: await getCharacters(db) });
}

const mutation: IResolvers = {
  Mutation: {
    async addVote(
      _: void,
      { character },
      { db, pubsub }: { db: Db; pubsub: PubSub }
    ) {
      // Comprobar que el personaje existe
      const selectCharacter = await getCharacter(db, character);

      if (selectCharacter === null || selectCharacter === undefined) {
        return response(
          false,
          'El personaje introducido no existe y no puedes votar',
          db
        );
      }

      // Obtenemos el id del voto
      const vote = {
        id: await asignVoteId(db),
        character,
        createdAt: new Datetime().getCurrentDateTime(),
      };

      return await db
        .collection(COLLECTIONS.VOTES)
        .insertOne(vote)
        .then(async () => {
          sendNotification(pubsub, db);
          return response(
            true,
            'El personaje existe y se ha emitido correctamente el voto',
            db
          );
        })
        .catch(async () => {
          return response(
            false,
            'El voto NO se ha emitido. Prueba de nuevo por favor',
            db
          );
        });
    },

    async updateVote(
      _: void,
      { id, character },
      { db, pubsub }: { db: Db; pubsub: PubSub }
    ) {
      // Comprobar que el personaje existe
      const selectCharacter = await getCharacter(db, character);

      if (selectCharacter === null || selectCharacter === undefined) {
        return response(
          false,
          'El personaje introducido no existe y no puedes actualizar el voto',
          db
        );
      }
      // Comprobar que el voto existe
      const selectVote = await getVote(db, id);
      if (selectVote === null || selectVote === undefined) {
        return response(
          false,
          'El voto introducido no existe y no puedes actualizar',
          db
        );
      }

      // Actualizar el voto despues de comprobar
      return await db
        .collection(COLLECTIONS.VOTES)
        .updateOne({ id }, { $set: { character } })
        .then(async () => {
          sendNotification(pubsub, db);
          return response(true, 'Voto actualizado correctamente', db);
        })
        .catch(async () => {
          return response(
            false,
            'Voto NO actualizado correctamente. Prueba de nuevo por favor',
            db
          );
        });
    },

    async deleteVote(
      _: void,
      { id },
      { db, pubsub }: { db: Db; pubsub: PubSub }
    ) {
      // Comprobar que el voto existe
      const selectVote = await getVote(db, id);

      if (selectVote === null || selectVote === undefined) {
        return response(
          false,
          'El voto introducido no existe y no puedes borrarlo',
          db
        );
      }

      // Si existe, borrarlo
      return await db
        .collection(COLLECTIONS.VOTES)
        .deleteOne({ id })
        .then(async () => {
          sendNotification(pubsub, db);
          return response(true, 'Voto borrado correctamente', db);
        })
        .catch(async () => {
          return response(
            false,
            'Voto NO borrado, Por favor intentelo de nuevo',
            db
          );
        });
    },
  },
};

export default mutation;
