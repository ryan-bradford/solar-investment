import { getRepository } from 'typeorm';
import { getRandomInt, logger } from '@shared';
import { IPersistedInvestment, IStorableInvestment, PersistedInvestment, IPersistedInvestor, IStoredInvestor } from '@entities';
import { getDaos } from '@daos';

export interface IInvestmentDao {
    getInvestment(id: number): Promise<IPersistedInvestment | null>;
    getInvestments(userId?: number): Promise<IPersistedInvestment[]>;
    createInvestment(investment: IStorableInvestment): Promise<IPersistedInvestment>;
    deleteInvestment(id: number): Promise<void>;
    transferInvestment(id: number, from: IPersistedInvestor, to: IPersistedInvestor): Promise<void>;
    saveInvestment(investment: IPersistedInvestment): Promise<void>;
}

export class SqlInvestmentDao implements IInvestmentDao {


    public async getInvestments(userId?: number): Promise<IPersistedInvestment[]> {
        return getRepository(PersistedInvestment).find({
            relations: ['contract', 'owner'],
        }).then((investments) =>
            investments.filter((investment) => !userId || investment.owner.id === userId));
    }


    public async getInvestment(id: number): Promise<IPersistedInvestment | null> {
        return getRepository(PersistedInvestment).findOne(id, {
            relations: ['contract', 'owner'],
        }).then((investment) => investment ? investment : null);
    }


    public async createInvestment(investment: IStorableInvestment): Promise<IPersistedInvestment> {
        const daos = await getDaos();
        const investorDao = new daos.SqlInvestorDao();
        const contractDao = new daos.SqlContractDao();
        const toSave = new PersistedInvestment();
        const contract = await contractDao.getContract(investment.contractId);
        if (!contract) {
            throw new Error('Contract not found');
        }
        toSave.contract = contract;
        toSave.percentage = investment.percentage;
        toSave.id = getRandomInt();
        const investor = await investorDao.getOne(investment.ownerId);
        if (!investor) {
            throw new Error('Investor not found');
        }
        toSave.owner = investor;
        await getRepository(PersistedInvestment).save(toSave);
        return toSave;
    }


    public async deleteInvestment(id: number): Promise<void> {
        await getRepository(PersistedInvestment).delete(id);
        return;
    }


    public async transferInvestment(id: number, from: IPersistedInvestor, to: IPersistedInvestor): Promise<void> {
        const investment = await this.getInvestment(id);
        if (!investment) {
            throw new Error('Not found');
        }
        if (investment.owner.id !== from.id) {
            throw new Error('Not right owner');
        }
        investment.owner = to;
        await this.saveInvestment(investment);
        return;
    }


    public async  saveInvestment(investment: IPersistedInvestment): Promise<void> {
        await getRepository(PersistedInvestment).save(investment);
        return;
    }
}
