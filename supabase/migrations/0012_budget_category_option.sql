-- Categorias de budget deixam de ser um enum fixo (SALARIO/TREINAMENTO/
-- CONFRATERNIZACOES) e passam a ser CompanyOption ("CATEGORIA_BUDGET"),
-- gerenciável em Configurações — permite cadastrar categorias livres
-- (ex.: Benefícios) sem alteração de schema.
alter table company_options
  drop constraint company_options_category_check;
alter table company_options
  add constraint company_options_category_check
    check (category in ('SETOR', 'HORARIO_TRABALHO', 'MODALIDADE_CONTRATACAO', 'CATEGORIA_BUDGET'));
