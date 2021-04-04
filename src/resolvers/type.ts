import { IResolvers } from 'graphql-tools';
import { getCharacterVotes } from '../lib/database-operations';
import { PHOTO_URL } from '../config/constants';

const type: IResolvers = {
  Character: {
    votes: async (parent: any, __: any, { db }) => {
      return await getCharacterVotes(db, parent.id);
    },
    photo: (parent) => PHOTO_URL.concat(parent.photo),
  },
};

export default type;
