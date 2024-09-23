import type {
  ListPrismsResponse,
  PrismType,
  PrismMember,
  ListPrismBindingsResponse,
  PrismBinding,
  PrismPayResponse,
  PrismMemberPayouts,
  DeletePrismResponse,
  DeletedPrism,
  CreateBindingReponse,
  DeleteBindingResponse
} from '$lib/@types/plugins.js'
import type { PrismInterface } from '../interfaces.js'
import type { CorelnConnectionInterface } from './types.js'

class Prism implements PrismInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  /* ----- 
  Prisms
  ----- */
  async listPrisms(): Promise<PrismType[]> {
    const { prisms } = (await this.connection.rpc({
      method: 'prism-list'
    })) as ListPrismsResponse

    return prisms.map(prism => {
      return {
        id: prism.prism_id,
        ...prism
      }
    })
  }

  async createPrism(
    description: string,
    members: PrismMember[],
    outlay_factor: number
  ): Promise<PrismType> {
    const prism = (await this.connection.rpc({
      method: 'prism-create',
      params: {
        description,
        members,
        outlay_factor
      }
    })) as PrismType
    return {
      id: prism.prism_id,
      ...prism
    }
  }

  async payPrism(prism_id: string, amount_msat: number): Promise<PrismMemberPayouts> {
    const { prism_member_payouts } = (await this.connection.rpc({
      method: 'prism-pay',
      params: {
        prism_id,
        amount_msat
      }
    })) as PrismPayResponse
    return prism_member_payouts
  }

  async deletePrism(prism_id: string): Promise<DeletedPrism> {
    const { deleted } = (await this.connection.rpc({
      method: 'prism-delete',
      params: {
        prism_id
      }
    })) as DeletePrismResponse

    return deleted
  }

  /* -----
  Bindings
  ----- */
  async listBindings(offer_id?: string): Promise<PrismBinding[]> {
    const { bolt12_prism_bindings } = (await this.connection.rpc({
      method: 'prism-bindinglist',
      ...(offer_id && { offer_id })
    })) as ListPrismBindingsResponse

    return bolt12_prism_bindings.map(prismBinding => {
      return {
        id: prismBinding.prism_id,
        ...prismBinding
      }
    })
  }

  async createBinding(prism_id: string, offer_id: string): Promise<CreateBindingReponse> {
    const response = (await this.connection.rpc({
      method: 'prism-bindingadd',
      params: {
        prism_id,
        offer_id
      }
    })) as CreateBindingReponse

    return response
  }

  async updateBindingOutlay(
    offer_id: string,
    member_id: string,
    new_outlay_msat: number
  ): Promise<PrismBinding[]> {
    const { bolt12_prism_bindings } = (await this.connection.rpc({
      method: 'prism-setoutlay',
      params: {
        offer_id,
        member_id,
        new_outlay_msat
      }
    })) as ListPrismBindingsResponse

    return bolt12_prism_bindings
  }

  async deleteBinding(offer_id: string): Promise<DeletedBinding> {
    const { binding_removed } = (await this.connection.rpc({
      method: 'prism-bindingremove',
      params: {
        offer_id
      }
    })) as DeleteBindingResponse

    return binding_removed
  }
}

export default Prism
